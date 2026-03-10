import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Default simple test user ID (since we don't have auth yet)
// We will create this user on startup
const TEST_USER_ID = 'test-user-id';

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Smart CV API is running' });
});

// Create a dummy user on startup for MVP
async function ensureTestUser() {
  try {
    const user = await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        email: 'test@example.com',
        password_hash: 'dummy',
        full_name: 'Test Setup User'
      }
    });

    // Ensure Master Profile exists
    await prisma.masterProfile.upsert({
      where: { id: 'test-master-profile' },
      update: {},
      create: {
        id: 'test-master-profile',
        user_id: user.id,
        contact_email: 'test@example.com',
      }
    });
    
    console.log("Test user and master profile ensured.");
  } catch (error) {
    console.error("Error creating test user:", error);
  }
}

ensureTestUser();

// --- MASTER PROFILE ROUTES ---

// Get Master Profile
app.get('/api/master-profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.masterProfile.findFirst({
      where: { user_id: TEST_USER_ID },
      include: {
        experiences: true,
        educations: true,
        skills: true
      }
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update Master Profile (Basic Info)
app.put('/api/master-profile', async (req: Request, res: Response) => {
  try {
    const { contact_email, phone, linkedin_url, location, professional_summary } = req.body;
    
    const profile = await prisma.masterProfile.findFirst({
      where: { user_id: TEST_USER_ID }
    });

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const updated = await prisma.masterProfile.update({
      where: { id: profile.id },
      data: { contact_email, phone, linkedin_url, location, professional_summary }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Add Experience
app.post('/api/master-profile/experience', async (req: Request, res: Response) => {
  try {
    const { company, role, start_date, end_date, description, responsibilities } = req.body;
    
    const profile = await prisma.masterProfile.findFirst({ where: { user_id: TEST_USER_ID } });
    if (!profile) return res.status(404).send('Profile not found');

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
    res.status(500).json({ error: 'Failed to add experience' });
  }
});


// Delete Experience
app.delete('/api/master-profile/experience/:id', async (req: Request, res: Response) => {
  try {
    await prisma.experience.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete experience' });
  }
});

// Add Skill
app.post('/api/master-profile/skill', async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    const profile = await prisma.masterProfile.findFirst({ where: { user_id: TEST_USER_ID } });
    if (!profile) return res.status(404).send('Profile not found');

    const skill = await prisma.skill.create({
      data: { master_profile_id: profile.id, name, category }
    });
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Delete Skill
app.delete('/api/master-profile/skill/:id', async (req: Request, res: Response) => {
  try {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// Add Education
app.post('/api/master-profile/education', async (req: Request, res: Response) => {
  try {
    const { institution, degree, start_date, end_date } = req.body;
    const profile = await prisma.masterProfile.findFirst({ where: { user_id: TEST_USER_ID } });
    if (!profile) return res.status(404).send('Profile not found');

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
    res.status(500).json({ error: 'Failed to add education' });
  }
});

// Delete Education
app.delete('/api/master-profile/education/:id', async (req: Request, res: Response) => {
  try {
    await prisma.education.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete education' });
  }
});


// --- AI CV GENERATOR ROUTES ---

import { generatePdfFromHtml, buildCvHtml } from './pdfService';

app.post('/api/generate-cv', async (req: Request, res: Response) => {
  try {
    const { job_title, company_name, job_description_text } = req.body;
    
    // 1. Fetch full Master Profile
    const profile = await prisma.masterProfile.findFirst({
      where: { user_id: TEST_USER_ID },
      include: { experiences: true, educations: true, skills: true, user: true }
    });

    // Removed strict check for incomplete profile so user can test freely.
    // if (!profile) return res.status(404).json({ error: 'Master profile incomplete' });

    // 2. Setup Gemini AI Call
    const safeProfile = profile || { skills: [], experiences: [], educations: [] };
    let tailoredContent = {
      message: "AI tailored content generated using Google Gemini.",
      filtered_skills: safeProfile.skills,
      filtered_experiences: safeProfile.experiences,
      filtered_educations: safeProfile.educations
    };

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && profile) { // Only call Gemini if we have profile data to work with
           const ai = new GoogleGenAI({ apiKey });
           
           const systemPrompt = `You are an expert HR AI assistant. Your goal is to tailor the user's master profile to a specific job description. 
           Instructions:
           1. Select only the most relevant skills.
           2. Select the most relevant work experiences.
           3. For each selected experience, you can slightly prioritize or rephrase the "responsibilities" to highlight match the job's keywords.
           4. Return a strict JSON object with:
              - "filtered_skills": array of skill strings that match.
              - "filtered_experiences": array of objects: { "id": "original_id", "responsibilities": ["bullet 1", "bullet 2"] }
           5. Do NOT include any explanations or markdown formatting. Just the JSON.`;

           const promptText = `
Job Description:
${job_description_text}

Candidate Master Profile Data:
Skills: ${JSON.stringify(profile.skills.map(s => s.name))}
Experience: ${JSON.stringify(profile.experiences.map(e => ({ id: e.id, role: e.role, company: e.company, responsibilities: JSON.parse(e.responsibilities || '[]') })))}
           `;

           const result = await ai.models.generateContent({
               model: 'gemini-2.0-flash',
               contents: promptText,
               config: { systemInstruction: systemPrompt }
           });
           
           const aiResponseText = result.text;
           if(aiResponseText) {
               try {
                   const cleanJson = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
                   const parsed = JSON.parse(cleanJson);
                   
                   if (parsed.filtered_skills) {
                       tailoredContent.filtered_skills = profile.skills.filter(s => 
                           parsed.filtered_skills.some((name: string) => name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(name.toLowerCase()))
                       );
                   }
                   
                   if (parsed.filtered_experiences) {
                       tailoredContent.filtered_experiences = parsed.filtered_experiences.map((aiExp: any) => {
                           const original = profile.experiences.find(e => e.id === aiExp.id);
                           if (original) {
                               return {
                                   ...original,
                                   responsibilities: JSON.stringify(aiExp.responsibilities || JSON.parse(original.responsibilities || '[]'))
                               };
                           }
                           return null;
                       }).filter(Boolean);
                   }
                   
                   console.log("Successfully tailored CV with Gemini AI.");
               } catch (parseError) {
                   console.error("Failed to parse Gemini JSON, using fallback:", parseError, aiResponseText);
               }
           }
        } else {
           console.log("GEMINI_API_KEY or Profile data missing. skipping Gemini call.");
        }
    } catch(aiError) {
        console.error("Gemini failed, falling back to all profile data:", aiError);
    }

    // 3. Save Job Application
    const jobApp = await prisma.jobApplication.create({
      data: {
        user_id: TEST_USER_ID,
        job_title: job_title || 'Software Engineer',
        company_name: company_name || 'Tech Corp',
        job_description_text: job_description_text
      }
    });

    // 4. Save Generated CV Data
    const genCv = await prisma.generatedCV.create({
      data: {
        job_application_id: jobApp.id,
        tailored_content: JSON.stringify(tailoredContent) // saving stringified json
      }
    });

    res.json(genCv);
  } catch (error) {
    console.error("AI Gen error:", error);
    res.status(500).json({ error: 'Failed to generate CV. Make sure you entered data into Master Profile.' });
  }
});

app.get('/api/cv/:jobAppId/pdf', async (req: Request, res: Response) => {
  try {
    // 1. Get CV Data
    const genCv = await prisma.generatedCV.findUnique({
      where: { job_application_id: req.params.jobAppId },
      include: { 
        job_application: { include: { user: true } }
      }
    });

    if (!genCv) return res.status(404).send('CV not found');

    // Also get Master Profile to build the top data quickly
    const profile: any = await prisma.masterProfile.findFirst({
      where: { user_id: genCv.job_application.user.id }
    });
    
    // Merge full Master info with AI filtered lists
    const tailored = JSON.parse(genCv.tailored_content);
    profile.experiences = tailored.filtered_experiences;
    profile.educations = tailored.filtered_educations;
    profile.skills = tailored.filtered_skills;
    profile.full_name = genCv.job_application.user.full_name;

    // 2. Build HTML and Render PDF
    const html = buildCvHtml(profile, genCv.job_application.job_description_text);
    const pdfBuffer = await generatePdfFromHtml(html);

    res.contentType("application/pdf");
    res.setHeader('Content-Disposition', `attachment; filename="SmartCV_${genCv.job_application.company_name}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).send('Error generating PDF.');
  }
});

app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const apps = await prisma.jobApplication.findMany({
      where: { user_id: TEST_USER_ID },
      include: { generated_cv: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/cv/:jobAppId/html', async (req: Request, res: Response) => {
  try {
    const genCv = await prisma.generatedCV.findUnique({
      where: { job_application_id: req.params.jobAppId },
      include: { job_application: { include: { user: true } } }
    });

    if (!genCv) return res.status(404).send('CV not found');

    const profile: any = await prisma.masterProfile.findFirst({
      where: { user_id: genCv.job_application.user.id }
    });
    
    const tailored = JSON.parse(genCv.tailored_content);
    profile.experiences = tailored.filtered_experiences;
    profile.educations = tailored.filtered_educations;
    profile.skills = tailored.filtered_skills;
    profile.full_name = genCv.job_application.user.full_name;

    const html = buildCvHtml(profile, genCv.job_application.job_description_text);
    res.send(html);
  } catch (error) {
    console.error("HTML generation error:", error);
    res.status(500).send('Error generating HTML.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

