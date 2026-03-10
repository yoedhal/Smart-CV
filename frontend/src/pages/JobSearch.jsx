import React, { useState } from 'react';
import { Sparkles, FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { generateCV, getPdfDownloadUrl, getHtmlPreviewUrl } from '../services/api';

const JobSearch = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCvUrl, setGeneratedCvUrl] = useState(null);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log("Starting CV Generation for:", companyName);
      const result = await generateCV({
        job_title: jobTitle || 'מעמד למשרה',
        company_name: companyName || 'חברה כלשהי',
        job_description_text: jobDescription
      });
      
      setGeneratedCvUrl(getPdfDownloadUrl(result.id || result.job_application_id));
      setPreviewHtmlUrl(getHtmlPreviewUrl(result.id || result.job_application_id));
    } catch (error) {
      console.error("Generation failed:", error);
      setError('חלה שגיאה בתהליך יצירת הקובץ. ייתכן שיש בעיה בתקשורת עם ה-AI, נסה שוב בעוד רגע.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={36} color="#c084fc" /> 
          התאמת קורות חיים למשרה (AI)
        </h1>
        <p style={{ fontSize: '1.125rem' }}>הדבק את תיאור המשרה למטה. ה-AI שלנו יסרוק את ה-Master Profile שלך וייצור את הקו"ח המושלמים עבורך.</p>
      </div>

      {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
          </div>
      )}

      {!generatedCvUrl ? (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">שם התפקיד</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="למשל: מפתח React בכיר"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">שם החברה</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="למשל: Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '1rem', color: 'var(--text-main)' }}>תיאור המשרה (או לינק למשרה)</label>
            <textarea 
              className="form-textarea" 
              style={{ minHeight: '200px', fontSize: '1.125rem' }}
              placeholder="הדבק כאן את דרישות המשרה או את תיאור התפקיד המלא..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.25rem' }}
            onClick={handleGenerate}
            disabled={isGenerating || !jobDescription.trim()}
          >
            {isGenerating ? (
               <><Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} /> מעבד עם AI... זה לוקח כמה שניות</>
            ) : (
              <><Sparkles size={24} /> צור קורות חיים מותאמים</>
            )}
          </button>
        </section>
      ) : (
        <section className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'stretch' }}>
          
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem'
            }}>
              <FileText size={40} color="var(--secondary)" />
            </div>
            <h2>הקו"ח שלך מוכנים!</h2>
            <p style={{ marginBottom: '2rem' }}>ה-AI סינן ודייק את הניסיון והכישורים שלך עבור המשרה ב-{companyName || 'חברה'}.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <a href={generatedCvUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', width: '100%', fontSize: '1.1rem' }}>
                <Download size={20} /> הורד קובץ PDF
              </a>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setGeneratedCvUrl(null); setPreviewHtmlUrl(null); setJobDescription(''); setJobTitle(''); setCompanyName(''); }}>
                צור קו"ח חדשים
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1rem', height: '800px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc' }}>
              <Sparkles size={20} /> תצוגה מקדימה (AI Optimized)
            </h3>
            <iframe 
                src={previewHtmlUrl} 
                style={{ width: '100%', flex: '1', border: 'none', borderRadius: 'var(--radius-md)', background: '#fff' }} 
                title="CV Preview"
            />
          </div>

        </section>
      )}

      {/* Internal spin animation for loader */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default JobSearch;
