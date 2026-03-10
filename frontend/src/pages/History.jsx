import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Download, Eye, Calendar, Building2, FileText, X } from 'lucide-react';
import { getApplications, getPdfDownloadUrl, getHtmlPreviewUrl } from '../services/api';

const History = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewApp, setPreviewApp] = useState(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await getApplications();
        setApplications(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApps();
  }, []);

  return (
    <div className="animate-fade-in" style={{ direction: 'ltr' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <HistoryIcon size={32} color="#818cf8" /> Application History
        </h1>
        <p>View all the CVs you've generated, download them again, or preview them.</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid rgba(129,140,248,0.2)',
            borderTop: '3px solid #818cf8', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
          }} />
          Loading history...
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-muted)' }}>No applications yet</h3>
          <p style={{ marginBottom: 0 }}>You haven't generated any CVs yet. Go to "Apply for Role" to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {applications.map(app => (
            <div key={app.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{app.job_title}</h3>
                <p style={{ margin: '0 0 0.5rem 0', color: '#c084fc', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={14} /> {app.company_name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} />
                  {new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {app.generated_cv && (
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                      CV Generated
                    </span>
                  )}
                </div>
              </div>

              {app.generated_cv && (
                <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setPreviewApp(app)}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
                  >
                    <Eye size={16} /> Preview
                  </button>
                  <a
                    href={getPdfDownloadUrl(app.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '0.55rem 1rem', fontSize: '0.9rem', textDecoration: 'none' }}
                  >
                    <Download size={16} /> PDF
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewApp && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
          }}
          onClick={() => setPreviewApp(null)}
        >
          <div
            style={{
              background: 'rgba(15,23,42,0.98)', border: '1px solid var(--surface-border)',
              borderRadius: '16px', width: '100%', maxWidth: '900px', height: '85vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{previewApp.job_title}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#c084fc' }}>{previewApp.company_name}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <a
                  href={getPdfDownloadUrl(previewApp.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <Download size={16} /> Download PDF
                </a>
                <button onClick={() => setPreviewApp(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                  <X size={22} />
                </button>
              </div>
            </div>
            <iframe
              src={getHtmlPreviewUrl(previewApp.id)}
              style={{ flex: 1, border: 'none', background: '#fff' }}
              title="CV Preview"
            />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default History;
