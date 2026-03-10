import React, { useState } from 'react';
import { Sparkles, FileText, Download, Loader2, AlertCircle, Eye, RotateCcw } from 'lucide-react';
import { generateCV, getPdfDownloadUrl, getHtmlPreviewUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

const JobSearch = () => {
  const { showToast } = useToast();
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJobAppId, setGeneratedJobAppId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateCV({
        job_title: jobTitle || 'תפקיד לא מוגדר',
        company_name: companyName || 'חברה לא מוגדרת',
        job_description_text: jobDescription
      });

      // Use job_application_id - this is what the PDF/HTML routes expect
      const jobAppId = result.job_application_id;
      setGeneratedJobAppId(jobAppId);
      showToast('קורות החיים נוצרו בהצלחה!', 'success');
    } catch (err) {
      console.error('Generation failed:', err);
      const msg = err.response?.data?.error || 'שגיאה ביצירת קורות החיים. ודא שמילאת מידע בפרופיל המאסטר.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedJobAppId(null);
    setPreviewOpen(false);
    setJobDescription('');
    setJobTitle('');
    setCompanyName('');
    setError(null);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', direction: 'rtl' }}>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={36} color="#c084fc" />
          התאמת קורות חיים למשרה
        </h1>
        <p style={{ fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          הדבק את תיאור המשרה. ה-AI יסנן ויתאים את ניסיונך ומיומנויותיך עבורה.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem 1.25rem',
          borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {!generatedJobAppId ? (
        <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">שם התפקיד</label>
              <input
                type="text"
                className="form-input"
                placeholder="למשל: מפתח Full Stack בכיר"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">שם החברה</label>
              <input
                type="text"
                className="form-input"
                placeholder="למשל: Google"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.6rem' }}>
              תיאור המשרה *
            </label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '220px' }}
              placeholder="הדבק כאן את דרישות המשרה או תיאור התפקיד המלא. ככל שתדייק יותר — ה-AI יוכל לסנן טוב יותר..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            onClick={handleGenerate}
            disabled={isGenerating || !jobDescription.trim()}
          >
            {isGenerating
              ? <><Loader2 size={22} style={{ animation: 'spin 0.8s linear infinite' }} /> מעבד עם AI... זה לוקח כמה שניות</>
              : <><Sparkles size={22} /> צור קורות חיים מותאמים</>
            }
          </button>
        </section>
      ) : (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left: Success Panel */}
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={36} color="var(--secondary)" />
            </div>

            <div>
              <h2 style={{ marginBottom: '0.4rem' }}>הקו"ח מוכנים!</h2>
              <p style={{ marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ה-AI ניתח את המשרה וסינן את הניסיון הרלוונטי עבורך.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => setPreviewOpen(!previewOpen)}
              >
                <Eye size={18} /> {previewOpen ? 'סגור תצוגה' : 'תצוגה מקדימה'}
              </button>
              <a
                href={getPdfDownloadUrl(generatedJobAppId)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', textDecoration: 'none' }}
              >
                <Download size={18} /> הורד PDF
              </a>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleReset}>
                <RotateCcw size={18} /> צור קו"ח חדשים
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="glass-panel" style={{ padding: '1rem', height: '80vh', display: previewOpen ? 'flex' : 'flex', flexDirection: 'column' }}>
            {previewOpen ? (
              <>
                <h3 style={{ marginBottom: '0.75rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                  <Sparkles size={18} /> תצוגה מקדימה — AI Optimized
                </h3>
                <iframe
                  src={getHtmlPreviewUrl(generatedJobAppId)}
                  style={{ flex: 1, border: 'none', borderRadius: 'var(--radius-md)', background: '#fff' }}
                  title="CV Preview"
                />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
                <Eye size={48} style={{ opacity: 0.3 }} />
                <p style={{ margin: 0, textAlign: 'center' }}>לחץ על "תצוגה מקדימה" כדי לראות את קורות החיים</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default JobSearch;
