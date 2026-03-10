import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import prisma from './db';
import { GoogleGenAI } from '@google/genai';
import { generatePdfFromHtml, buildCvHtml, closeBrowser } from './pdfService';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ── Require JWT_SECRET in env (no hardcoded fallback) ──────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

// ── CORS: whitelist from env ────────────────────────────────────────────────
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));

// ── Body size limit (prevent huge payloads) ────────────────────────────────
app.use(express.json({ limit: '100kb' }));

// ── Rate limiters ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many CV generation requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

// ── Input helpers ────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

function sanitizeString(value: unknown, maxLen = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, maxLen);
}

// ──────────────────────────────────────────────
// Auth Middleware
// ──────────────────────────────────────────────
const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  // Support token via Authorization header OR query param (needed for iframe/browser download)
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const token = (authHeader && authHeader.split(' ')[1]) || queryToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token, please log in again.' });
  }
};

// ──────────────────────────────────────────────
// Health
// ──────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Smart CV API is running' });
});

// ──────────────────────────────────────────────
// Auth Routes
// ──────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const email = sanitizeString(req.body.email, 254);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const full_name = sanitizeString(req.body.full_name, 200);

    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Please fill in all fields' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    if (full_name.length < 2) {
      res.status(400).json({ error: 'Please enter your full name' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email address is already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password_hash, full_name }
    });

    // Auto-create master profile for new user
    await prisma.masterProfile.create({
      data: { user_id: user.id, contact_email: email }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET!, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration error, please try again' });
  }
});

app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const email = sanitizeString(req.body.email, 254);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter your email and password' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET!, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login error, please try again' });
  }
});

// ──────────────────────────────────────────────
// Master Profile Routes (all protected)
// ──────────────────────────────────────────────
app.get('/api/master-profile', authenticate, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.masterProfile.findFirst({
      where: { user_id: req.user!.id },
      include: {
        experiences: { orderBy: { start_date: 'desc' } },
        educations: { orderBy: { start_date: 'desc' } },
        skills: true,
        user: true
      }
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Error loading profile' });
  }
});

app.put('/api/master-profile', authenticate, async (req: Request, res: Response) => {
  try {
    const contact_email = sanitizeString(req.body.contact_email, 254);
    const phone = sanitizeString(req.body.phone, 30);
    const linkedin_url = sanitizeString(req.body.linkedin_url, 300);
    const location = sanitizeString(req.body.location, 200);
    const professional_summary = sanitizeString(req.body.professional_summary, 2000);

    const profile = await prisma.masterProfile.findFirst({ where: { user_id: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    if (req.body.full_name) {
      const full_name = sanitizeString(req.body.full_name, 200);
      if (full_name) {
        await prisma.user.update({
          where: { id: req.user!.id },
          data: { full_name }
        });
      }
    }

    const updated = await prisma.masterProfile.update({
      where: { id: profile.id },
      data: { contact_email, phone, linkedin_url, location, professional_summary }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error saving profile' });
  }
});

app.post('/api/master-profile/experience', authenticate, async (req: Request, res: Response) => {
  try {
    const company = sanitizeString(req.body.company, 200);
    const role = sanitizeString(req.body.role, 200);
    const start_date = sanitizeString(req.body.start_date, 20);
    const end_date = sanitizeString(req.body.end_date, 20);
    const description = sanitizeString(req.body.description, 1000);
    const responsibilities = Array.isArray(req.body.responsibilities)
      ? req.body.responsibilities.slice(0, 20).map((r: unknown) => String(r).slice(0, 500))
      : [];

    if (!company || !role || !start_date) {
      res.status(400).json({ error: 'Company, role, and start date are required' });
      return;
    }

    const profile = await prisma.masterProfile.findFirst({ where: { user_id: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const exp = await prisma.experience.create({
      data: {
        master_profile_id: profile.id,
        company,
        role,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        description,
        responsibilities: JSON.stringify(responsibilities)
      }
    });

    res.json(exp);
  } catch (error) {
    res.status(500).json({ error: 'Error adding experience' });
  }
});

app.delete('/api/master-profile/experience/:id', authenticate, async (req: Request, res: Response) => {
  try {
    // Verify ownership before deleting
    const exp = await prisma.experience.findUnique({
      where: { id: String(req.params.id) },
      include: { master_profile: true }
    });
    if (!exp || exp.master_profile.user_id !== req.user!.id) {
      res.status(404).json({ error: 'Experience not found' });
      return;
    }
    await prisma.experience.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting experience' });
  }
});

app.post('/api/master-profile/skill', authenticate, async (req: Request, res: Response) => {
  try {
    const name = sanitizeString(req.body.name, 100);
    const category = sanitizeString(req.body.category, 50);

    if (!name) {
      res.status(400).json({ error: 'Skill name is required' });
      return;
    }

    const profile = await prisma.masterProfile.findFirst({ where: { user_id: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const skill = await prisma.skill.create({
      data: { master_profile_id: profile.id, name, category: category || 'General' }
    });
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Error adding skill' });
  }
});

app.delete('/api/master-profile/skill/:id', authenticate, async (req: Request, res: Response) => {
  try {
    // Verify ownership before deleting
    const skill = await prisma.skill.findUnique({
      where: { id: String(req.params.id) },
      include: { master_profile: true }
    });
    if (!skill || skill.master_profile.user_id !== req.user!.id) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }
    await prisma.skill.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting skill' });
  }
});

app.post('/api/master-profile/education', authenticate, async (req: Request, res: Response) => {
  try {
    const institution = sanitizeString(req.body.institution, 200);
    const degree = sanitizeString(req.body.degree, 200);
    const start_date = sanitizeString(req.body.start_date, 20);
    const end_date = sanitizeString(req.body.end_date, 20);

    if (!institution || !degree || !start_date) {
      res.status(400).json({ error: 'Institution, degree, and start date are required' });
      return;
    }

    const profile = await prisma.masterProfile.findFirst({ where: { user_id: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const edu = await prisma.education.create({
      data: {
        master_profile_id: profile.id,
        institution,
        degree,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null
      }
    });
    res.json(edu);
  } catch (error) {
    res.status(500).json({ error: 'Error adding education' });
  }
});

app.delete('/api/master-profile/education/:id', authenticate, async (req: Request, res: Response) => {
  try {
    // Verify ownership before deleting
    const edu = await prisma.education.findUnique({
      where: { id: String(req.params.id) },
      include: { master_profile: true }
    });
    if (!edu || edu.master_profile.user_id !== req.user!.id) {
      res.status(404).json({ error: 'Education not found' });
      return;
    }
    await prisma.education.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting education' });
  }
});

// ──────────────────────────────────────────────
// Parse existing CV text into profile structure
// ──────────────────────────────────────────────
app.post('/api/master-profile/parse-cv', authenticate, async (req: Request, res: Response) => {
  try {
    const cvText = sanitizeString(req.body.cv_text, 15000);
    if (!cvText || cvText.length < 50) {
      res.status(400).json({ error: 'Please provide CV text (at least 50 characters)' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'AI service not configured' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an expert CV parser. Extract structured data from the CV text provided.
Return ONLY a strict JSON object with these fields (use null for missing values):
{
  "full_name": string,
  "contact_email": string | null,
  "phone": string | null,
  "location": string | null,
  "linkedin_url": string | null,
  "professional_summary": string | null,
  "skills": string[],
  "experiences": [
    {
      "company": string,
      "role": string,
      "start_date": "YYYY-MM-DD" | null,
      "end_date": "YYYY-MM-DD" | null,
      "description": string | null,
      "responsibilities": string[]
    }
  ],
  "educations": [
    {
      "institution": string,
      "degree": string,
      "start_date": "YYYY-MM-DD" | null,
      "end_date": "YYYY-MM-DD" | null
    }
  ]
}
No explanations, no markdown, just raw JSON.`;

    const result = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Parse this CV:\n\n${cvText}`,
        config: { systemInstruction: systemPrompt }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 30000)
      )
    ]);

    const raw = (result as any).text || '';
    const cleanJson = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    res.json(parsed);
  } catch (error) {
    console.error('CV parse error:', error);
    res.status(500).json({ error: 'Failed to parse CV. Please check the text and try again.' });
  }
});

// ──────────────────────────────────────────────
// AI CV Generation
// ──────────────────────────────────────────────
const MAX_JOB_DESC_LENGTH = 10000;

app.post('/api/generate-cv', authenticate, generateLimiter, async (req: Request, res: Response) => {
  try {
    const job_title = sanitizeString(req.body.job_title, 200) || 'Unspecified Role';
    const company_name = sanitizeString(req.body.company_name, 200) || 'Unspecified Company';
    let job_description_text = sanitizeString(req.body.job_description_text, MAX_JOB_DESC_LENGTH);

    if (!job_description_text || job_description_text.length < 20) {
      res.status(400).json({ error: 'Please provide a job description (at least 20 characters)' });
      return;
    }

    const profile = await prisma.masterProfile.findFirst({
      where: { user_id: req.user!.id },
      include: { experiences: true, educations: true, skills: true, user: true }
    });

    const safeProfile = profile || { skills: [], experiences: [], educations: [] };

    let tailoredContent: any = {
      message: 'Content tailored by Google Gemini AI.',
      filtered_skills: (safeProfile as any).skills || [],
      filtered_experiences: (safeProfile as any).experiences || [],
      filtered_educations: (safeProfile as any).educations || []
    };

    // Gemini AI tailoring
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && profile && profile.experiences.length > 0) {
        const ai = new GoogleGenAI({ apiKey });

        const systemPrompt = `You are an expert HR AI assistant. Your goal is to tailor the user's master profile to a specific job description.
Instructions:
1. Select only the most relevant skills (as array of name strings).
2. Select the most relevant work experiences (by their ID).
3. For each selected experience, rephrase the "responsibilities" to highlight keywords from the job description.
4. Return ONLY a strict JSON object with:
   - "filtered_skills": array of skill name strings that match.
   - "filtered_experiences": array of objects: { "id": "original_id", "responsibilities": ["bullet 1", "bullet 2"] }
5. Do NOT include any explanations or markdown. Just raw JSON.`;

        const promptText = `
Job Title: ${job_title}
Company: ${company_name}
Job Description:
${job_description_text}

Candidate Profile:
Skills: ${JSON.stringify(profile.skills.map(s => s.name))}
Experience: ${JSON.stringify(profile.experiences.map(e => ({
  id: e.id,
  role: e.role,
  company: e.company,
  responsibilities: (() => { try { return JSON.parse(e.responsibilities || '[]'); } catch { return []; } })()
})))}
`;

        const result = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: promptText,
            config: { systemInstruction: systemPrompt }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
          )
        ]);

        const aiResponseText = (result as any).text;
        if (aiResponseText) {
          try {
            // Strip markdown code blocks if present
            const cleanJson = aiResponseText
              .replace(/```json\s*/gi, '')
              .replace(/```\s*/g, '')
              .trim();
            const parsed = JSON.parse(cleanJson);

            if (Array.isArray(parsed.filtered_skills)) {
              tailoredContent.filtered_skills = profile.skills.filter(s =>
                parsed.filtered_skills.some((name: string) =>
                  typeof name === 'string' && (
                    name.toLowerCase().includes(s.name.toLowerCase()) ||
                    s.name.toLowerCase().includes(name.toLowerCase())
                  )
                )
              );
            }

            if (Array.isArray(parsed.filtered_experiences)) {
              tailoredContent.filtered_experiences = parsed.filtered_experiences
                .map((aiExp: any) => {
                  const original = profile.experiences.find(e => e.id === aiExp.id);
                  if (original) {
                    const responsibilities = Array.isArray(aiExp.responsibilities)
                      ? aiExp.responsibilities
                      : (() => { try { return JSON.parse(original.responsibilities || '[]'); } catch { return []; } })();
                    return { ...original, responsibilities: JSON.stringify(responsibilities) };
                  }
                  return null;
                })
                .filter(Boolean);
            }

            tailoredContent.filtered_educations = profile.educations;
            console.log('Successfully tailored CV with Gemini AI.');
          } catch (parseError) {
            console.error('Failed to parse Gemini JSON, using full profile:', parseError);
          }
        }
      } else {
        console.log('Gemini skipped: missing API key or empty profile.');
      }
    } catch (aiError) {
      console.error('Gemini error, using full profile as fallback:', aiError);
    }

    // Save JobApplication
    const jobApp = await prisma.jobApplication.create({
      data: {
        user_id: req.user!.id,
        job_title,
        company_name,
        job_description_text
      }
    });

    // Save GeneratedCV
    const genCv = await prisma.generatedCV.create({
      data: {
        job_application_id: jobApp.id,
        tailored_content: JSON.stringify(tailoredContent)
      }
    });

    res.json({ ...genCv, job_application_id: jobApp.id });
  } catch (error) {
    console.error('CV generation error:', error);
    res.status(500).json({ error: 'Error generating CV. Ensure you have filled out your profile info.' });
  }
});

// ──────────────────────────────────────────────
// CV Download / Preview
// ──────────────────────────────────────────────
async function buildCvData(jobAppId: string, userId: string) {
  const genCv = await prisma.generatedCV.findUnique({
    where: { job_application_id: jobAppId }
  });
  if (!genCv) return null;

  const jobApp = await prisma.jobApplication.findUnique({
    where: { id: jobAppId },
    include: { user: true }
  });
  if (!jobApp) return null;

  // Verify ownership
  if (jobApp.user_id !== userId) return null;

  const profile: any = await prisma.masterProfile.findFirst({
    where: { user_id: jobApp.user_id }
  });

  let tailored: any;
  try {
    tailored = JSON.parse(genCv.tailored_content);
  } catch {
    tailored = { filtered_experiences: [], filtered_educations: [], filtered_skills: [] };
  }

  profile.experiences = tailored.filtered_experiences || [];
  profile.educations = tailored.filtered_educations || [];
  profile.skills = tailored.filtered_skills || [];
  profile.full_name = (jobApp as any).user?.full_name || '';

  return { genCv, jobApp, profile };
}

app.get('/api/cv/:jobAppId/pdf', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await buildCvData(String(req.params.jobAppId), req.user!.id);
    if (!data) { res.status(404).send('CV not found'); return; }

    const html = buildCvHtml(data.profile, data.jobApp.job_description_text);
    const pdfBuffer = await generatePdfFromHtml(html);

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SmartCV_${data.jobApp.company_name}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).send('Error generating PDF.');
  }
});

app.get('/api/cv/:jobAppId/html', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await buildCvData(String(req.params.jobAppId), req.user!.id);
    if (!data) { res.status(404).send('CV not found'); return; }

    const html = buildCvHtml(data.profile, data.jobApp.job_description_text);
    res.send(html);
  } catch (error) {
    console.error('HTML preview error:', error);
    res.status(500).send('Error generating preview.');
  }
});

// ──────────────────────────────────────────────
// Applications History (with pagination)
// ──────────────────────────────────────────────
app.get('/api/applications', authenticate, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const search = sanitizeString(req.query.search as string, 200);

    const where: any = { user_id: req.user!.id };
    if (search) {
      where.OR = [
        { job_title: { contains: search } },
        { company_name: { contains: search } }
      ];
    }

    const [apps, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        include: { generated_cv: { select: { id: true, generated_at: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.jobApplication.count({ where })
    ]);

    res.json({
      data: apps,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error loading history' });
  }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await closeBrowser();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeBrowser();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Smart CV Server running on port ${port}`);
});
