import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, Download, Loader2, AlertCircle, Eye, RotateCcw, CheckCircle, Wand2 } from 'lucide-react';
import { generateCV, getPdfDownloadUrl, getHtmlPreviewUrl, getPreviewToken } from '../services/api';
import { useToast } from '../context/ToastContext';

const JobSearch = () => {
  const { showToast } = useToast();
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJobAppId, setGeneratedJobAppId] = useState(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewToken, setPreviewToken] = useState(null);
  const [error, setError] = useState(null);

  // Fetch preview token when we have a jobAppId
  useEffect(() => {
    if (!generatedJobAppId) { setPreviewToken(null); return; }
    getPreviewToken(generatedJobAppId)
      .then(token => setPreviewToken(token))
      .catch(() => setPreviewToken(null));
  }, [generatedJobAppId]);

  const wordCount = jobDescription.trim()
    ? jobDescription.trim().split(/\s+/).length
    : 0;

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateCV({
        job_title: jobTitle || 'Unspecified Role',
        company_name: companyName || 'Unspecified Company',
        job_description_text: jobDescription
      });

      setGeneratedJobAppId(result.job_application_id);
      setAiUsed(result.ai_used || false);
      setPreviewOpen(true);
      showToast(result.ai_used ? 'CV tailored by AI and ready!' : 'CV generated!', 'success');
    } catch (err) {
      console.error('Generation failed:', err);
      const msg = err.response?.data?.error || 'Error generating CV. Please ensure your Master Profile is complete.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedJobAppId(null);
    setPreviewOpen(false);
    setPreviewToken(null);
    setJobDescription('');
    setJobTitle('');
    setCompanyName('');
    setError(null);
    setAiUsed(false);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', direction: 'ltr' }}>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={36} color="#c084fc" />
          Tailor CV to Job
        </h1>
        <p style={{ fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Paste the job description. The AI will filter and adapt your experience, skills, and write a tailored professional summary.
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
              <label className="form-label">Job Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Senior Full Stack Developer"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Google"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label className="form-label" style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 0 }}>
                Job Description *
              </label>
              {wordCount > 0 && (
                <span style={{
                  fontSize: '0.78rem', color: wordCount >= 50 ? 'var(--secondary)' : '#f59e0b',
                  background: wordCount >= 50 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  padding: '0.2rem 0.6rem', borderRadius: '10px',
                  border: `1px solid ${wordCount >= 50 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`
                }}>
                  {wordCount} words {wordCount < 50 ? '— add more for better results' : '✓'}
                </span>
              )}
            </div>
            <textarea
              className="form-textarea"
              style={{ minHeight: '220px' }}
              placeholder="Paste the full job description here. The more detail you provide, the better the AI can tailor your CV to this specific role..."
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
              ? <><Loader2 size={22} style={{ animation: 'spin 0.8s linear infinite' }} /> AI is tailoring your CV...</>
              : <><Wand2 size={22} /> Create Tailored CV</>
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
              <CheckCircle size={36} color="var(--secondary)" />
            </div>

            <div>
              <h2 style={{ marginBottom: '0.4rem' }}>CV Ready!</h2>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {aiUsed
                  ? 'AI analyzed the job and wrote a tailored summary, filtered relevant experience, and selected matching skills.'
                  : 'Your full profile has been included. Add more experience and skills for AI tailoring.'}
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.78rem', padding: '0.3rem 0.8rem', borderRadius: '20px',
                background: aiUsed ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.15)',
                color: aiUsed ? '#818cf8' : '#94a3b8',
                border: `1px solid ${aiUsed ? 'rgba(99,102,241,0.3)' : 'rgba(100,116,139,0.3)'}`
              }}>
                <Sparkles size={12} />
                {aiUsed ? 'AI Tailored' : 'Full Profile'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => setPreviewOpen(!previewOpen)}
              >
                <Eye size={18} /> {previewOpen ? 'Close Preview' : 'Preview CV'}
              </button>
              <a
                href={getPdfDownloadUrl(generatedJobAppId, previewToken)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', textDecoration: 'none' }}
              >
                <Download size={18} /> Download PDF
              </a>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleReset}>
                <RotateCcw size={18} /> New CV
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="glass-panel" style={{ padding: '1rem', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            {previewOpen ? (
              <>
                <h3 style={{ marginBottom: '0.75rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                  <Sparkles size={18} /> Live Preview
                </h3>
                {previewToken ? (
                  <iframe
                    src={getHtmlPreviewUrl(generatedJobAppId, previewToken)}
                    style={{ flex: 1, border: 'none', borderRadius: 'var(--radius-md)', background: '#fff' }}
                    title="CV Preview"
                  />
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.25 }} />
                <p style={{ margin: 0, textAlign: 'center' }}>Click "Preview CV" to see the result</p>
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
