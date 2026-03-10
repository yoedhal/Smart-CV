import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

export function buildCvHtml(profile: any, jobDesc: string): string {
  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
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
        ul { margin-top: 5px; padding-right: 20px; list-style-type: none; }
        li { margin-bottom: 4px; position: relative; }
        li::before { content: "•"; color: #4F46E5; margin-left: 8px; }
        .skills-container { display: flex; flex-wrap: wrap; gap: 10px; }
        .skill-badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${profile.full_name || 'ישראל ישראלי'}</h1>
        <div class="contact">
          ${profile.contact_email || ''} | ${profile.phone || ''} | ${profile.location || ''}
        </div>
      </div>

      <div>
        <h2>תקציר מקצועי</h2>
        <p>${profile.professional_summary || 'איש מקצוע מנוסה.'}</p>
      </div>

      <div>
        <h2>ניסיון תעסוקתי</h2>
        ${(profile.experiences || []).map((exp: any) => {
          let tasks = [];
          try { tasks = JSON.parse(exp.responsibilities || '[]'); } catch(e){}
          if (!Array.isArray(tasks)) tasks = [];
          
          return `
          <div class="item">
            <div class="item-title">
              <span>${exp.role} - ${exp.company}</span>
              <span class="date">${new Date(exp.start_date).getFullYear()} - ${exp.end_date ? new Date(exp.end_date).getFullYear() : 'היום'}</span>
            </div>
            <p style="margin: 5px 0 0;">${exp.description || ''}</p>
            <ul>
              ${tasks.map((t: string) => `<li>${t}</li>`).join('')}
            </ul>
          </div>
          `;
        }).join('')}
      </div>

      ${profile.educations && profile.educations.length > 0 ? `
      <div>
        <h2>השכלה</h2>
        ${profile.educations.map((edu: any) => `
        <div class="item">
          <div class="item-title">
            <span>${edu.degree} - ${edu.institution}</span>
            <span class="date">${new Date(edu.start_date).getFullYear()} - ${edu.end_date ? new Date(edu.end_date).getFullYear() : 'היום'}</span>
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <div>
        <h2>כישורים</h2>
        <div class="skills-container">
          ${(profile.skills || []).map((s: any) => `<span class="skill-badge">${s.name}</span>`).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
}
