import puppeteer, { Browser } from 'puppeteer';

// ── Singleton browser instance (avoids ~2s startup per PDF) ─────────────────
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({ headless: true });
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export function buildCvHtml(profile: any, jobDesc: string): string {
  const escapeHtml = (str: string) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const formatYear = (date: string | Date | null): string => {
    if (!date) return 'Present';
    try { return new Date(date).getFullYear().toString(); } catch { return 'Present'; }
  };

  return `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Assistant', sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #4F46E5;
          padding-bottom: 20px;
        }
        h1 { margin: 0; color: #1e1b4b; font-size: 2.5rem; }
        .contact { color: #666; font-size: 0.9rem; margin-top: 5px; }
        h2 { color: #4F46E5; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; }
        .item { margin-bottom: 15px; }
        .item-title { font-weight: bold; font-size: 1.1rem; display: flex; justify-content: space-between; }
        .item-subtitle { color: #666; font-style: italic; }
        .date { color: #888; font-size: 0.9rem; }
        ul { margin-top: 5px; padding-left: 20px; list-style-type: none; }
        li { margin-bottom: 4px; position: relative; }
        li::before { content: "•"; color: #4F46E5; margin-right: 8px; }
        .skills-container { display: flex; flex-wrap: wrap; gap: 10px; }
        .skill-badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(profile.full_name || 'John Doe')}</h1>
        <div class="contact">
          ${[profile.contact_email, profile.phone, profile.location].filter(Boolean).map(escapeHtml).join(' | ')}
        </div>
      </div>

      <div>
        <h2>Professional Summary</h2>
        <p>${escapeHtml(profile.professional_summary || 'Experienced Professional.')}</p>
      </div>

      <div>
        <h2>Work Experience</h2>
        ${(profile.experiences || []).map((exp: any) => {
          let tasks: string[] = [];
          try {
            const parsed = typeof exp.responsibilities === 'string'
              ? JSON.parse(exp.responsibilities)
              : exp.responsibilities;
            tasks = Array.isArray(parsed) ? parsed : [];
          } catch { tasks = []; }

          return `
          <div class="item">
            <div class="item-title">
              <span>${escapeHtml(exp.role)} - ${escapeHtml(exp.company)}</span>
              <span class="date">${formatYear(exp.start_date)} - ${formatYear(exp.end_date)}</span>
            </div>
            ${exp.description ? `<p style="margin: 5px 0 0;">${escapeHtml(exp.description)}</p>` : ''}
            ${tasks.length > 0 ? `<ul>${tasks.map((t: string) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
          </div>
          `;
        }).join('')}
      </div>

      ${profile.educations && profile.educations.length > 0 ? `
      <div>
        <h2>Education</h2>
        ${profile.educations.map((edu: any) => `
        <div class="item">
          <div class="item-title">
            <span>${escapeHtml(edu.degree)} - ${escapeHtml(edu.institution)}</span>
            <span class="date">${formatYear(edu.start_date)} - ${formatYear(edu.end_date)}</span>
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <div>
        <h2>Skills</h2>
        <div class="skills-container">
          ${(profile.skills || []).map((s: any) => `<span class="skill-badge">${escapeHtml(typeof s === 'string' ? s : s.name)}</span>`).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
}
