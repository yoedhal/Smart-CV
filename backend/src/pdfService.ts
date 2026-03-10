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
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export function buildCvHtml(profile: any, _jobDesc: string): string {
  const escapeHtml = (str: string) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const formatDate = (date: string | Date | null): string => {
    if (!date) return 'Present';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch { return 'Present'; }
  };

  const experiences: any[] = profile.experiences || [];
  const educations: any[] = profile.educations || [];
  const skills: any[] = profile.skills || [];

  const skillsHtml = skills.map((s: any) =>
    `<span class="skill-tag">${escapeHtml(typeof s === 'string' ? s : s.name)}</span>`
  ).join('');

  const experiencesHtml = experiences.map((exp: any) => {
    let tasks: string[] = [];
    try {
      const parsed = typeof exp.responsibilities === 'string'
        ? JSON.parse(exp.responsibilities)
        : exp.responsibilities;
      tasks = Array.isArray(parsed) ? parsed : [];
    } catch { tasks = []; }

    return `
    <div class="exp-item">
      <div class="exp-header">
        <span class="exp-role">${escapeHtml(exp.role)}</span>
        <span class="exp-dates">${formatDate(exp.start_date)} — ${formatDate(exp.end_date)}</span>
      </div>
      <div class="exp-company">${escapeHtml(exp.company)}</div>
      ${exp.description ? `<div class="exp-description">${escapeHtml(exp.description)}</div>` : ''}
      ${tasks.length > 0 ? `
        <ul class="exp-bullets">
          ${tasks.map((t: string) => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>` : ''}
    </div>`;
  }).join('');

  const educationsHtml = educations.map((edu: any) => `
    <div class="edu-item">
      <div class="edu-degree">${escapeHtml(edu.degree)}</div>
      <div class="edu-institution">${escapeHtml(edu.institution)}</div>
      <div class="edu-dates">${formatDate(edu.start_date)} — ${formatDate(edu.end_date)}</div>
    </div>`
  ).join('');

  const contactItems = [
    profile.contact_email ? `<span class="contact-item"><span class="contact-icon">✉</span>${escapeHtml(profile.contact_email)}</span>` : '',
    profile.phone ? `<span class="contact-item"><span class="contact-icon">☎</span>${escapeHtml(profile.phone)}</span>` : '',
    profile.location ? `<span class="contact-item"><span class="contact-icon">⌖</span>${escapeHtml(profile.location)}</span>` : '',
    profile.linkedin_url ? `<span class="contact-item"><span class="contact-icon">in</span>${escapeHtml(profile.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//i, 'linkedin.com/'))}</span>` : ''
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.55;
    }

    /* ── Header ── */
    .cv-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #4338ca 60%, #6d28d9 100%);
      color: white;
      padding: 28px 36px 24px;
    }
    .cv-header h1 {
      font-size: 24pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      line-height: 1.1;
    }
    .contact-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
      margin-top: 8px;
      opacity: 0.92;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 8.5pt;
      font-weight: 400;
    }
    .contact-icon {
      font-size: 10pt;
      opacity: 0.85;
      font-weight: 600;
    }

    /* ── Two-column body ── */
    .cv-body {
      display: grid;
      grid-template-columns: 195px 1fr;
    }

    /* ── Sidebar ── */
    .sidebar {
      background: #f1f5f9;
      padding: 22px 18px;
      border-right: 3px solid #4338ca;
    }
    .sidebar-section {
      margin-bottom: 22px;
    }
    .sidebar-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      color: #4338ca;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1.5px solid #c7d2fe;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .skill-tag {
      display: inline-block;
      background: white;
      color: #3730a3;
      border: 1px solid #a5b4fc;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 500;
      line-height: 1.4;
    }

    /* ── Main content ── */
    .main-content {
      padding: 22px 30px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      border-bottom: 2px solid #4338ca;
      padding-bottom: 4px;
      margin-bottom: 12px;
    }

    /* ── Experience ── */
    .exp-item {
      margin-bottom: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .exp-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .exp-role {
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
      flex: 1;
    }
    .exp-dates {
      font-size: 8pt;
      color: #6366f1;
      font-weight: 600;
      white-space: nowrap;
      background: #eef2ff;
      padding: 2px 7px;
      border-radius: 10px;
    }
    .exp-company {
      color: #4338ca;
      font-weight: 600;
      font-size: 9pt;
      margin: 3px 0 6px;
    }
    .exp-description {
      color: #64748b;
      font-size: 8.5pt;
      font-style: italic;
      margin-bottom: 5px;
    }
    .exp-bullets {
      list-style: none;
      padding: 0;
      margin: 4px 0 0;
    }
    .exp-bullets li {
      position: relative;
      padding-left: 14px;
      margin-bottom: 3px;
      font-size: 9pt;
      color: #334155;
      line-height: 1.5;
    }
    .exp-bullets li::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #6366f1;
      font-size: 9pt;
    }

    /* ── Summary ── */
    .summary-text {
      font-size: 9.5pt;
      color: #374151;
      line-height: 1.65;
    }

    /* ── Education ── */
    .edu-item {
      margin-bottom: 10px;
    }
    .edu-item:last-child { margin-bottom: 0; }
    .edu-degree {
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
    }
    .edu-institution {
      color: #4338ca;
      font-weight: 600;
      font-size: 9pt;
      margin: 2px 0;
    }
    .edu-dates {
      color: #94a3b8;
      font-size: 8.5pt;
    }
  </style>
</head>
<body>

  <div class="cv-header">
    <h1>${escapeHtml(profile.full_name || 'Your Name')}</h1>
    <div class="contact-row">
      ${contactItems}
    </div>
  </div>

  <div class="cv-body">

    <!-- Sidebar -->
    <div class="sidebar">
      ${skills.length > 0 ? `
      <div class="sidebar-section">
        <div class="sidebar-title">Skills</div>
        <div class="skills-grid">
          ${skillsHtml}
        </div>
      </div>` : ''}

      ${educations.length > 0 ? `
      <div class="sidebar-section">
        <div class="sidebar-title">Education</div>
        ${educationsHtml}
      </div>` : ''}
    </div>

    <!-- Main Content -->
    <div class="main-content">

      ${profile.professional_summary ? `
      <div class="section">
        <div class="section-title">Professional Summary</div>
        <p class="summary-text">${escapeHtml(profile.professional_summary)}</p>
      </div>` : ''}

      ${experiences.length > 0 ? `
      <div class="section">
        <div class="section-title">Work Experience</div>
        ${experiencesHtml}
      </div>` : ''}

    </div>
  </div>

</body>
</html>`;
}
