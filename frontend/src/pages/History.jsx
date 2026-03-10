import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Download, ExternalLink, Calendar } from 'lucide-react';
import { getApplications, getPdfDownloadUrl } from '../services/api';

const History = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <HistoryIcon size={32} color="#818cf8" /> Application History
        </h1>
        <p>Review and download all your previously tailored CVs.</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading your history...</div>
      ) : applications.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>You haven't generated any CVs yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {applications.map(app => (
            <div key={app.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>{app.job_title}</h3>
                <p style={{ margin: '0 0 0.5rem 0', color: '#c084fc', fontWeight: '500' }}>{app.company_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Calendar size={14} /> {new Date(app.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a 
                    href={getPdfDownloadUrl(app.id)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem' }}
                >
                  <Download size={18} /> PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
