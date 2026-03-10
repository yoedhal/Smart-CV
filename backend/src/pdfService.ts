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

  // Group skills by category
  const skillsByCategory: Record<string, string[]> = {};
  for (const s of skills) {
    const name = typeof s === 'string' ? s : (s.name || '');
    const category = (typeof s === 'object' && s.category) ? s.category : 'Skills';
    if (!name) continue;
    if (!skillsByCategory[category]) skillsByCategory[category] = [];
    skillsByCategory[category].push(name);
  }

  // If all skills are in one category or no categories, merge them under one header
  const categoryEntries = Object.entries(skillsByCategory);
  const useGrouped = categoryEntries.length > 1;

  const skillsHtml = useGrouped
    ? categoryEntries.map(([cat, names]) => `
      <div class="skill-group">
        <div class="skill-group-label">${escapeHtml(cat)}</div>
        <div class="skills-grid">
          ${names.map(n => `<span class="skill-tag">${escapeHtml(n)}</span>`).join('')}
        </div>
      </div>`).join('')
    : `<div class="skills-grid">${skills.map((s: any) =>
        `<span class="skill-tag">${escapeHtml(typeof s === 'string' ? s : s.name)}</span>`
      ).join('')}</div>`;

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
        <div class="exp-left">
          <div class="exp-role">${escapeHtml(exp.role)}</div>
          <div class="exp-company">${escapeHtml(exp.company)}</div>
        </div>
        <div class="exp-dates">${formatDate(exp.start_date)} – ${formatDate(exp.end_date)}</div>
      </div>
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
      <div class="edu-dates">${formatDate(edu.start_date)} – ${formatDate(edu.end_date)}</div>
    </div>`
  ).join('');

  // Contact items with SVG icons for cleaner look
  const contactItems = [
    profile.contact_email
      ? `<span class="contact-item">
           <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
           ${escapeHtml(profile.contact_email)}
         </span>` : '',
    profile.phone
      ? `<span class="contact-item">
           <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.9 19.79 19.79 0 0 1 1 3.18 2 2 0 0 1 2.96 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/></svg>
           ${escapeHtml(profile.phone)}
         </span>` : '',
    profile.location
      ? `<span class="contact-item">
           <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           ${escapeHtml(profile.location)}
         </span>` : '',
    profile.linkedin_url
      ? `<span class="contact-item">
           <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
           ${escapeHtml(profile.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//i, 'linkedin.com/'))}
         </span>` : ''
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
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #312e81 100%);
      color: white;
      padding: 26px 36px 22px;
      position: relative;
    }
    .cv-header::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
    }
    .header-name {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 0.3px;
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .header-headline {
      font-size: 11pt;
      font-weight: 400;
      color: #a5b4fc;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .contact-row {
      display: flex;
      flex-wrap: wrap;
      gap: 3px 16px;
      margin-top: 8px;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 8pt;
      font-weight: 400;
      color: rgba(255,255,255,0.85);
    }
    .contact-item svg {
      flex-shrink: 0;
      opacity: 0.8;
    }

    /* ── Two-column body ── */
    .cv-body {
      display: grid;
      grid-template-columns: 185px 1fr;
      min-height: calc(297mm - 80px);
    }

    /* ── Sidebar ── */
    .sidebar {
      background: #f8fafc;
      padding: 20px 16px;
      border-right: 2px solid #e2e8f0;
    }
    .sidebar-section {
      margin-bottom: 20px;
    }
    .sidebar-title {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #4338ca;
      margin-bottom: 9px;
      padding-bottom: 5px;
      border-bottom: 1.5px solid #c7d2fe;
    }

    /* Skill groups */
    .skill-group {
      margin-bottom: 10px;
    }
    .skill-group-label {
      font-size: 7.5pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 5px;
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
      border: 1px solid #c7d2fe;
      padding: 2.5px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 500;
      line-height: 1.5;
    }

    /* Education in sidebar */
    .edu-item {
      margin-bottom: 11px;
    }
    .edu-item:last-child { margin-bottom: 0; }
    .edu-degree {
      font-weight: 600;
      font-size: 8.5pt;
      color: #0f172a;
      line-height: 1.3;
    }
    .edu-institution {
      color: #4338ca;
      font-weight: 500;
      font-size: 8pt;
      margin: 2px 0 1px;
    }
    .edu-dates {
      color: #94a3b8;
      font-size: 7.5pt;
    }

    /* ── Main content ── */
    .main-content {
      padding: 20px 28px;
    }
    .section {
      margin-bottom: 18px;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-bottom: 1.5px solid #4338ca;
      padding-bottom: 4px;
      margin-bottom: 11px;
    }

    /* ── Summary ── */
    .summary-text {
      font-size: 9pt;
      color: #374151;
      line-height: 1.7;
    }

    /* ── Experience ── */
    .exp-item {
      margin-bottom: 13px;
      padding-bottom: 13px;
      border-bottom: 0.75px solid #e2e8f0;
    }
    .exp-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 4px;
    }
    .exp-left {
      flex: 1;
    }
    .exp-role {
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
      line-height: 1.2;
    }
    .exp-company {
      color: #4338ca;
      font-weight: 600;
      font-size: 8.5pt;
      margin-top: 2px;
    }
    .exp-dates {
      font-size: 7.5pt;
      color: #6366f1;
      font-weight: 600;
      white-space: nowrap;
      background: #eef2ff;
      padding: 2.5px 7px;
      border-radius: 10px;
      flex-shrink: 0;
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
      margin: 5px 0 0;
    }
    .exp-bullets li {
      position: relative;
      padding-left: 13px;
      margin-bottom: 3px;
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.55;
    }
    .exp-bullets li::before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #6366f1;
      font-size: 9pt;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <div class="cv-header">
    <div class="header-name">${escapeHtml(profile.full_name || 'Your Name')}</div>
    ${profile.job_headline ? `<div class="header-headline">${escapeHtml(profile.job_headline)}</div>` : ''}
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
        ${skillsHtml}
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
