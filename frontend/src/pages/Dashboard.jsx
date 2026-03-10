import React, { useState, useEffect } from 'react';
import { Plus, User, Briefcase, GraduationCap, CheckCircle, Trash2, X, Info } from 'lucide-react';
import { getMasterProfile, updateMasterProfile, addExperience, deleteExperience, addEducation, deleteEducation, addSkill, deleteSkill } from '../services/api';

const Dashboard = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    professionalSummary: ''
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
          fullName: data.user?.full_name || '',
          email: data.contact_email || '',
          phone: data.phone || '',
          professionalSummary: data.professional_summary || '',
        });
        setExperiences(data.experiences || []);
        setEducations(data.educations || []);
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
        await updateMasterProfile({
            contact_email: profile.email,
            phone: profile.phone,
            professional_summary: profile.professionalSummary
        });
        alert('המידע האישי נשמר בהצלחה!');
    } catch (err) {
        console.error(err);
        alert('שגיאה בשמירת הפרופיל');
    } finally {
        setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: value }));
  };

  const handleAddExperience = async () => {
    if(!newExp.company || !newExp.role || !newExp.start_date) return alert('נא למלא חברה, תפקיד ותאריך התחלה');
    try {
        const payload = {
            ...newExp,
            responsibilities: newExp.responsibilities.split('\n').filter(r => r.trim() !== '')
        };
        await addExperience(payload);
        setShowExpForm(false);
        setNewExp({ company: '', role: '', start_date: '', end_date: '', description: '', responsibilities: '' });
        fetchProfile(); 
    } catch(e) { console.error(e); }
  };

  const handleDeleteExp = async (id) => {
      if(!confirm('האם למחוק ניסיון זה?')) return;
      try {
          await deleteExperience(id);
          fetchProfile();
      } catch(e) { console.error(e); }
  }

  const handleAddEducation = async () => {
    if(!newEdu.institution || !newEdu.degree || !newEdu.start_date) return alert('נא למלא מוסד, תואר ותאריך התחלה');
    try {
        await addEducation(newEdu);
        setShowEduForm(false);
        setNewEdu({ institution: '', degree: '', start_date: '', end_date: '' });
        fetchProfile(); 
    } catch(e) { console.error(e); }
  };

  const handleDeleteEducation = async (id) => {
      if(!confirm('האם למחוק השכלה זו?')) return;
      try {
          await deleteEducation(id);
          fetchProfile();
      } catch(e) { console.error(e); }
  }

  const handleAddSkill = async (e) => {
    if(e.key === 'Enter' && newSkill.trim()) {
        try {
            await addSkill({ name: newSkill.trim(), category: 'General' });
            setNewSkill('');
            fetchProfile();
        } catch(e) { console.error(e); }
    }
  }
  const handleDeleteSkill = async (id) => {
      try { await deleteSkill(id); fetchProfile(); } catch(e) { console.error(e); }
  }

  const isProfileReady = experiences.length > 0 && skills.length > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'minmax(0, 1fr) 300px', direction: 'rtl' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <User size={32} color="#818cf8" /> פרופיל מאסטר (Master Profile)
        </h1>
        
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <Info size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
                זהו מאגר המידע המלא שלך. ה-AI ישלוף מכאן רק את הפרטים הרלוונטיים ביותר עבור כל משרה שתזין בעמוד "הגשת משרה". תדאג למלא כמה שיותר מידע כאן!
            </p>
        </div>
        
        {/* Personal Details Section */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>פרטים אישיים</h2>
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
          </div>
          <div className="form-group">
            <label className="form-label">טלפון</label>
            <input type="text" className="form-input" name="phone" value={profile.phone} onChange={handleInputChange} placeholder="052-1234567" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">תקציר מקצועי (כללי)</label>
            <textarea className="form-textarea" name="professionalSummary" value={profile.professionalSummary} onChange={handleInputChange} placeholder="ספר בקצרה על עצמך ועל הקריירה שלך..."></textarea>
          </div>
        </section>

        {/* Experience Section */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2><Briefcase size={24} style={{ display: 'inline', marginLeft: '0.5rem', transform: 'translateY(4px)' }} /> ניסיון תעסוקתי</h2>
            {!showExpForm && (
                <button className="btn btn-secondary" onClick={() => setShowExpForm(true)}>
                <Plus size={18} /> הוסף תפקיד
                </button>
            )}
          </div>
          
          {showExpForm && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#fff' }}>הוספת ניסיון</h3>
                      <button onClick={() => setShowExpForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group"><label className="form-label">חברה *</label><input type="text" className="form-input" value={newExp.company} onChange={e=>setNewExp({...newExp, company: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">תפקיד *</label><input type="text" className="form-input" value={newExp.role} onChange={e=>setNewExp({...newExp, role: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">תאריך התחלה *</label><input type="date" className="form-input" value={newExp.start_date} onChange={e=>setNewExp({...newExp, start_date: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">תאריך סיום (השאר ריק אם נוכחי)</label><input type="date" className="form-input" value={newExp.end_date} onChange={e=>setNewExp({...newExp, end_date: e.target.value})} /></div>
                  </div>
                  <div className="form-group">
                      <label className="form-label">תיאור קצר</label>
                      <input type="text" className="form-input" value={newExp.description} onChange={e=>setNewExp({...newExp, description: e.target.value})} />
                  </div>
                  <div className="form-group">
                      <label className="form-label">תחומי אחריות ופעולות (אחת בכל שורה)</label>
                      <textarea className="form-textarea" value={newExp.responsibilities} onChange={e=>setNewExp({...newExp, responsibilities: e.target.value})} placeholder="פיתוח מערכות מורכבות...&#10;ניהול צוות של 5 אנשים..."></textarea>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddExperience}>שמור ניסיון</button>
              </div>
          )}

          {experiences.length === 0 && !showExpForm ? (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)' }}>
                <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-muted)' }}>אין עדיין ניסיון תעסוקתי. זהו הבסיס החשוב ביותר ל-AI.</p>
              </div>
          ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {experiences.map(exp => (
                      <div key={exp.id} style={{ background: 'rgba(15,23,42,0.5)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                              <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>{exp.role} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>ב-</span> {exp.company}</h3>
                              <p style={{ fontSize: '0.875rem', color: '#c084fc', marginBottom: '0.5rem' }}>
                                  {new Date(exp.start_date).toLocaleDateString()} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'היום'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.9rem' }}>{exp.description}</p>
                          </div>
                          <button onClick={() => handleDeleteExp(exp.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', alignSelf: 'flex-start' }}><Trash2 size={18} /></button>
                      </div>
                  ))}
              </div>
          )}
        </section>

        {/* Education Section */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2><GraduationCap size={24} style={{ display: 'inline', marginLeft: '0.5rem', transform: 'translateY(4px)' }} /> השכלה</h2>
            {!showEduForm && (
                <button className="btn btn-secondary" onClick={() => setShowEduForm(true)}>
                <Plus size={18} /> הוסף השכלה
                </button>
            )}
          </div>
          
          {showEduForm && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#fff' }}>הוספת השכלה</h3>
                      <button onClick={() => setShowEduForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group"><label className="form-label">תואר / תעודה *</label><input type="text" className="form-input" value={newEdu.degree} onChange={e=>setNewEdu({...newEdu, degree: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">מוסד לימודים *</label><input type="text" className="form-input" value={newEdu.institution} onChange={e=>setNewEdu({...newEdu, institution: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">תאריך התחלה *</label><input type="date" className="form-input" value={newEdu.start_date} onChange={e=>setNewEdu({...newEdu, start_date: e.target.value})} /></div>
                      <div className="form-group"><label className="form-label">תאריך סיום</label><input type="date" className="form-input" value={newEdu.end_date} onChange={e=>setNewEdu({...newEdu, end_date: e.target.value})} /></div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddEducation}>שמור השכלה</button>
              </div>
          )}

          {educations.length === 0 && !showEduForm ? (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)' }}>
                <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-muted)' }}>אין מידע על השכלה.</p>
              </div>
          ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {educations.map(edu => (
                      <div key={edu.id} style={{ background: 'rgba(15,23,42,0.5)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                              <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>{edu.degree}</h3>
                              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>{edu.institution}</p>
                              <p style={{ fontSize: '0.875rem', color: '#c084fc', marginBottom: 0 }}>
                                  {new Date(edu.start_date).toLocaleDateString()} - {edu.end_date ? new Date(edu.end_date).toLocaleDateString() : 'היום'}
                              </p>
                          </div>
                          <button onClick={() => handleDeleteEducation(edu.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', alignSelf: 'flex-start' }}><Trash2 size={18} /></button>
                      </div>
                  ))}
              </div>
          )}
        </section>

        {/* Skills Section */}
        <section className="glass-panel">
            <h2>מיומנויות (Skills)</h2>
            <div className="form-group">
              <input 
                type="text" 
                className="form-input" 
                placeholder="הקלד מיומנות (למשל React) ולחץ Enter..." 
                value={newSkill} 
                onChange={(e) => setNewSkill(e.target.value)} 
                onKeyDown={handleAddSkill} 
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {skills.map(skill => (
                    <span key={skill.id} style={{ 
                        background: 'rgba(79, 70, 229, 0.2)', border: '1px solid rgba(79, 70, 229, 0.5)',
                        padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.875rem',
                        display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff'
                    }}>
                        {skill.name}
                        <X size={14} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => handleDeleteSkill(skill.id)} />
                    </span>
                ))}
            </div>
        </section>
      </div>

      {/* Sidebar Profile Status */}
      <div style={{ order: -1 }}>
        <div className="glass-panel" style={{ position: 'sticky', top: '6rem' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>מצב הפרופיל</h3>
          
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', padding: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: profile.fullName ? 'var(--secondary)' : 'var(--text-muted)' }}>
              <CheckCircle size={18} /> פרטים אישיים
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: experiences.length > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
              <CheckCircle size={18} /> ניסיון תעסוקתי ({experiences.length})
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: skills.length > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
              <CheckCircle size={18} /> מיומנויות ({skills.length})
            </li>
          </ul>

          <div style={{ marginTop: '2rem', padding: '1rem', background: isProfileReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: `1px solid ${isProfileReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
              {isProfileReady ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary)', textAlign: 'center' }}>🎉 הפרופיל מוכן! אתה יכול לעבור להגשת משרה.</p>
              ) : (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#ef4444', textAlign: 'center' }}>⚠️ חסר מידע: הוסף לפחות ניסיון אחד ומיומנות אחת כדי להפעיל את ה-AI.</p>
              )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
