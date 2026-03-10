import React, { useState, useEffect } from 'react';
import { Plus, User, Briefcase, GraduationCap, CheckCircle, Trash2, X, Info, MapPin, Linkedin } from 'lucide-react';
import { getMasterProfile, updateMasterProfile, addExperience, deleteExperience, addEducation, deleteEducation, addSkill, deleteSkill } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    fullName: '', email: '', phone: '', location: '', linkedin_url: '', professionalSummary: ''
  });
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [showExpForm, setShowExpForm] = useState(false);
  const [newExp, setNewExp] = useState({ company: '', role: '', start_date: '', end_date: '', description: '', responsibilities: '' });

  const [showEduForm, setShowEduForm] = useState(false);
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', start_date: '', end_date: '' });

  const [newSkill, setNewSkill] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await getMasterProfile();
      if (data) {
        setProfile({
          fullName: data.user?.full_name || user?.full_name || '',
          email: data.contact_email || '',
          phone: data.phone || '',
          location: data.location || '',
          linkedin_url: data.linkedin_url || '',
          professionalSummary: data.professional_summary || '',
        });
        setExperiences(data.experiences || []);
        setEducations(data.educations || []);
        setSkills(data.skills || []);
      }
    } catch (err) {
      showToast('שגיאה בטעינת הפרופיל', 'error');
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await updateMasterProfile({
        full_name: profile.fullName,
        contact_email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin_url: profile.linkedin_url,
        professional_summary: profile.professionalSummary
      });
      showToast('הפרטים האישיים נשמרו בהצלחה!', 'success');
    } catch (err) {
      showToast('שגיאה בשמירת הפרופיל', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: value }));
  };

  const handleAddExperience = async () => {
    if (!newExp.company || !newExp.role || !newExp.start_date) {
      showToast('נא למלא חברה, תפקיד ותאריך התחלה', 'error');
      return;
    }
    try {
      const payload = {
        ...newExp,
        responsibilities: newExp.responsibilities.split('\n').filter(r => r.trim() !== '')
      };
      await addExperience(payload);
      setShowExpForm(false);
      setNewExp({ company: '', role: '', start_date: '', end_date: '', description: '', responsibilities: '' });
      fetchProfile();
      showToast('הניסיון נוסף בהצלחה!', 'success');
    } catch (e) {
      showToast('שגיאה בהוספת ניסיון', 'error');
    }
  };

  const handleDeleteExp = async (id) => {
    if (!window.confirm('האם למחוק ניסיון זה?')) return;
    try {
      await deleteExperience(id);
      fetchProfile();
      showToast('הניסיון נמחק', 'info');
    } catch (e) {
      showToast('שגיאה במחיקת ניסיון', 'error');
    }
  };

  const handleAddEducation = async () => {
    if (!newEdu.institution || !newEdu.degree || !newEdu.start_date) {
      showToast('נא למלא מוסד, תואר ותאריך התחלה', 'error');
      return;
    }
    try {
      await addEducation(newEdu);
      setShowEduForm(false);
      setNewEdu({ institution: '', degree: '', start_date: '', end_date: '' });
      fetchProfile();
      showToast('ההשכלה נוספה בהצלחה!', 'success');
    } catch (e) {
      showToast('שגיאה בהוספת השכלה', 'error');
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('האם למחוק השכלה זו?')) return;
    try {
      await deleteEducation(id);
      fetchProfile();
      showToast('ההשכלה נמחקה', 'info');
    } catch (e) {
      showToast('שגיאה במחיקת השכלה', 'error');
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      await addSkill({ name: newSkill.trim(), category: 'General' });
      setNewSkill('');
      fetchProfile();
    } catch (e) {
      showToast('שגיאה בהוספת כישור', 'error');
    }
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') handleAddSkill();
  };

  const handleDeleteSkill = async (id) => {
    try {
      await deleteSkill(id);
      fetchProfile();
    } catch (e) {
      showToast('שגיאה במחיקת כישור', 'error');
    }
  };

  const isProfileReady = experiences.length > 0 && skills.length > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'minmax(0, 1fr) 280px', direction: 'rtl' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <User size={32} color="#818cf8" /> פרופיל מאסטר
        </h1>

        <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <Info size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            זהו מאגר המידע המלא שלך. ה-AI ישלוף מכאן את הפרטים הרלוונטיים ביותר עבור כל משרה. מלא כמה שיותר מידע!
          </p>
        </div>

        {/* Personal Details */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: 0 }}>פרטים אישיים</h2>
            <button className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }} onClick={handleSaveInfo} disabled={isSaving}>
              {isSaving ? 'שומר...' : 'שמור פרטים'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">שם מלא</label>
              <input type="text" className="form-input" name="fullName" value={profile.fullName} onChange={handleInputChange} placeholder="ישראל ישראלי" />
            </div>
            <div className="form-group">
              <label className="form-label">אימייל ליצירת קשר</label>
              <input type="email" className="form-input" name="email" value={profile.email} onChange={handleInputChange} placeholder="israel@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">טלפון</label>
              <input type="text" className="form-input" name="phone" value={profile.phone} onChange={handleInputChange} placeholder="052-1234567" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} /> מיקום
              </label>
              <input type="text" className="form-input" name="location" value={profile.location} onChange={handleInputChange} placeholder="תל אביב, ישראל" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Linkedin size={14} /> LinkedIn URL
            </label>
            <input type="url" className="form-input" name="linkedin_url" value={profile.linkedin_url} onChange={handleInputChange} placeholder="https://linkedin.com/in/yourprofile" dir="ltr" style={{ textAlign: 'left' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">תקציר מקצועי</label>
            <textarea className="form-textarea" name="professionalSummary" value={profile.professionalSummary} onChange={handleInputChange} placeholder="ספר בקצרה על עצמך ועל הקריירה שלך..." />
          </div>
        </section>

        {/* Experience Section */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={22} /> ניסיון תעסוקתי
            </h2>
            {!showExpForm && (
              <button className="btn btn-secondary" onClick={() => setShowExpForm(true)}>
                <Plus size={18} /> הוסף תפקיד
              </button>
            )}
          </div>

          {showExpForm && (
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>הוספת ניסיון תעסוקתי</h3>
                <button onClick={() => setShowExpForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">חברה *</label><input type="text" className="form-input" value={newExp.company} onChange={e => setNewExp({ ...newExp, company: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">תפקיד *</label><input type="text" className="form-input" value={newExp.role} onChange={e => setNewExp({ ...newExp, role: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">תאריך התחלה *</label><input type="date" className="form-input" value={newExp.start_date} onChange={e => setNewExp({ ...newExp, start_date: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">תאריך סיום (ריק = נוכחי)</label><input type="date" className="form-input" value={newExp.end_date} onChange={e => setNewExp({ ...newExp, end_date: e.target.value })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">תיאור קצר</label>
                <input type="text" className="form-input" value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">תחומי אחריות (אחת בכל שורה — חשוב מאוד ל-AI!)</label>
                <textarea className="form-textarea" value={newExp.responsibilities} onChange={e => setNewExp({ ...newExp, responsibilities: e.target.value })} placeholder="פיתחתי מערכת ניהול מורכבת עם React ו-Node.js...&#10;הובלתי צוות של 5 מפתחים...&#10;שיפרתי ביצועים ב-40%..." style={{ minHeight: '140px' }} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddExperience}>שמור ניסיון</button>
            </div>
          )}

          {experiences.length === 0 && !showExpForm ? (
            <div style={{ padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>אין עדיין ניסיון תעסוקתי. הוסף לפחות תפקיד אחד כדי שה-AI יוכל לפעול.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {experiences.map(exp => (
                <div key={exp.id} style={{ background: 'rgba(15,23,42,0.5)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0' }}>{exp.role} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>ב-</span> {exp.company}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#c084fc', marginBottom: '0.5rem' }}>
                      {new Date(exp.start_date).toLocaleDateString('he-IL')} – {exp.end_date ? new Date(exp.end_date).toLocaleDateString('he-IL') : 'היום'}
                    </p>
                    {exp.description && <p style={{ margin: 0, fontSize: '0.9rem' }}>{exp.description}</p>}
                  </div>
                  <button onClick={() => handleDeleteExp(exp.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem', flexShrink: 0 }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Education Section */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={22} /> השכלה
            </h2>
            {!showEduForm && (
              <button className="btn btn-secondary" onClick={() => setShowEduForm(true)}>
                <Plus size={18} /> הוסף השכלה
              </button>
            )}
          </div>

          {showEduForm && (
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>הוספת השכלה</h3>
                <button onClick={() => setShowEduForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">תואר / תעודה *</label><input type="text" className="form-input" value={newEdu.degree} onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">מוסד לימודים *</label><input type="text" className="form-input" value={newEdu.institution} onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">תאריך התחלה *</label><input type="date" className="form-input" value={newEdu.start_date} onChange={e => setNewEdu({ ...newEdu, start_date: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">תאריך סיום</label><input type="date" className="form-input" value={newEdu.end_date} onChange={e => setNewEdu({ ...newEdu, end_date: e.target.value })} /></div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddEducation}>שמור השכלה</button>
            </div>
          )}

          {educations.length === 0 && !showEduForm ? (
            <div style={{ padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>אין מידע על השכלה.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {educations.map(edu => (
                <div key={edu.id} style={{ background: 'rgba(15,23,42,0.5)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.2rem 0' }}>{edu.degree}</h3>
                    <p style={{ margin: '0 0 0.3rem 0', color: 'var(--text-muted)' }}>{edu.institution}</p>
                    <p style={{ fontSize: '0.85rem', color: '#c084fc', marginBottom: 0 }}>
                      {new Date(edu.start_date).toLocaleDateString('he-IL')} – {edu.end_date ? new Date(edu.end_date).toLocaleDateString('he-IL') : 'היום'}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteEducation(edu.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem', flexShrink: 0 }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Skills Section */}
        <section className="glass-panel">
          <h2 style={{ marginBottom: '1.25rem' }}>מיומנויות (Skills)</h2>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="הקלד מיומנות (למשל: React, Python, ניהול צוות)..."
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddSkill}
              disabled={!newSkill.trim()}
              style={{ flexShrink: 0, padding: '0.75rem 1.25rem' }}
            >
              <Plus size={18} /> הוסף
            </button>
          </div>
          {skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>הוסף לפחות מיומנות אחת כדי שה-AI יוכל לסנן.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {skills.map(skill => (
                <span key={skill.id} style={{
                  background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79, 70, 229, 0.4)',
                  padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c7d2fe'
                }}>
                  {skill.name}
                  <X size={13} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => handleDeleteSkill(skill.id)} />
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sidebar */}
      <div>
        <div className="glass-panel" style={{ position: 'sticky', top: '5.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            מצב הפרופיל
          </h3>

          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { label: 'פרטים אישיים', done: !!profile.fullName },
              { label: `ניסיון תעסוקתי (${experiences.length})`, done: experiences.length > 0 },
              { label: `מיומנויות (${skills.length})`, done: skills.length > 0 },
              { label: `השכלה (${educations.length})`, done: educations.length > 0 },
            ].map(({ label, done }) => (
              <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: done ? 'var(--secondary)' : 'var(--text-muted)' }}>
                <CheckCircle size={17} />
                <span style={{ fontSize: '0.9rem' }}>{label}</span>
              </li>
            ))}
          </ul>

          <div style={{
            marginTop: '1.75rem', padding: '1rem', textAlign: 'center',
            background: isProfileReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
            borderRadius: '10px',
            border: `1px solid ${isProfileReady ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            {isProfileReady ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                הפרופיל מוכן! עבור ל"הגש משרה" כדי ליצור קו"ח.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>
                הוסף לפחות ניסיון אחד ומיומנות אחת כדי להפעיל את ה-AI.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
