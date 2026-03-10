import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './db';
import { GoogleGenAI } from '@google/genai';
import { generatePdfFromHtml, buildCvHtml } from './pdfService';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'smartcv-dev-secret-2024';

app.use(cors());
app.use(express.json());

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
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
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Please fill in all fields' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration error, please try again' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

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
    const { contact_email, phone, linkedin_url, location, professional_summary } = req.body;

    const profile = await prisma.masterProfile.findFirst({ where: { user_id: req.user!.id } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Update user's full_name if provided
    if (req.body.full_name) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { full_name: req.body.full_name }
      });
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
    const { company, role, start_date, end_date, description, responsibilities } = req.body;

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
        responsibilities: JSON.stringify(responsibilities || [])
      }
    });

    res.json(exp);
  } catch (error) {
    res.status(500).json({ error: 'Error adding experience' });
  }
});

app.delete('/api/master-profile/experience/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.experience.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting experience' });
  }
});

app.post('/api/master-profile/skill', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
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
    await prisma.skill.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting skill' });
  }
});

app.post('/api/master-profile/education', authenticate, async (req: Request, res: Response) => {
  try {
    const { institution, degree, start_date, end_date } = req.body;
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
    await prisma.education.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting education' });
  }
});

// ──────────────────────────────────────────────
// AI CV Generation
// ──────────────────────────────────────────────
app.post('/api/generate-cv', authenticate, async (req: Request, res: Response) => {
  try {
    const { job_title, company_name, job_description_text } = req.body;

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
Job Title: ${job_title || 'Not specified'}
Company: ${company_name || 'Not specified'}
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

        const result = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: promptText,
          config: { systemInstruction: systemPrompt }
        });

        const aiResponseText = result.text;
        if (aiResponseText) {
          try {
            const cleanJson = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            if (parsed.filtered_skills) {
              tailoredContent.filtered_skills = profile.skills.filter(s =>
                parsed.filtered_skills.some((name: string) =>
                  name.toLowerCase().includes(s.name.toLowerCase()) ||
                  s.name.toLowerCase().includes(name.toLowerCase())
                )
              );
            }

            if (parsed.filtered_experiences) {
              tailoredContent.filtered_experiences = parsed.filtered_experiences
                .map((aiExp: any) => {
                  const original = profile.experiences.find(e => e.id === aiExp.id);
                  if (original) {
                    return {
                      ...original,
                      responsibilities: JSON.stringify(aiExp.responsibilities || JSON.parse(original.responsibilities || '[]'))
                    };
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
        job_title: job_title || 'Unspecified Role',
        company_name: company_name || 'Unspecified Company',
        job_description_text: job_description_text
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
async function buildCvData(jobAppId: string) {
  const genCv = await prisma.generatedCV.findUnique({
    where: { job_application_id: jobAppId }
  });
  if (!genCv) return null;

  const jobApp = await prisma.jobApplication.findUnique({
    where: { id: jobAppId },
    include: { user: true }
  });
  if (!jobApp) return null;

  const profile: any = await prisma.masterProfile.findFirst({
    where: { user_id: jobApp.user_id }
  });

  const tailored = JSON.parse(genCv.tailored_content);
  profile.experiences = tailored.filtered_experiences || [];
  profile.educations = tailored.filtered_educations || [];
  profile.skills = tailored.filtered_skills || [];
  profile.full_name = (jobApp as any).user?.full_name || '';

  return { genCv, jobApp, profile };
}

app.get('/api/cv/:jobAppId/pdf', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await buildCvData(String(req.params.jobAppId));
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
    const data = await buildCvData(String(req.params.jobAppId));
    if (!data) { res.status(404).send('CV not found'); return; }

    const html = buildCvHtml(data.profile, data.jobApp.job_description_text);
    res.send(html);
  } catch (error) {
    console.error('HTML preview error:', error);
    res.status(500).send('Error generating preview.');
  }
});

// ──────────────────────────────────────────────
// Applications History
// ──────────────────────────────────────────────
app.get('/api/applications', authenticate, async (req: Request, res: Response) => {
  try {
    const apps = await prisma.jobApplication.findMany({
      where: { user_id: req.user!.id },
      include: { generated_cv: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Error loading history' });
  }
});

app.listen(port, () => {
  console.log(`Smart CV Server running on port ${port}`);
});
