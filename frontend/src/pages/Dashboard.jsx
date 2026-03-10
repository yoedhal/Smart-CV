import React, { useState, useEffect } from 'react';
import { Plus, User, Briefcase, GraduationCap, CheckCircle, Trash2, X, Info, MapPin, Linkedin, Upload, Loader2 } from 'lucide-react';
import { getMasterProfile, updateMasterProfile, addExperience, deleteExperience, addEducation, deleteEducation, addSkill, deleteSkill, parseCvText } from '../services/api';
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

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

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
      showToast('Error loading profile', 'error');
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
      showToast('Personal details saved successfully!', 'success');
    } catch (err) {
      showToast('Error saving profile', 'error');
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
      showToast('Please fill in company, role, and start date', 'error');
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
      showToast('Experience added successfully!', 'success');
    } catch (e) {
      showToast('Error adding experience', 'error');
    }
  };

  const handleDeleteExp = async (id) => {
    if (!window.confirm('Delete this experience?')) return;
    try {
      await deleteExperience(id);
      fetchProfile();
      showToast('Experience deleted', 'info');
    } catch (e) {
      showToast('Error deleting experience', 'error');
    }
  };

  const handleAddEducation = async () => {
    if (!newEdu.institution || !newEdu.degree || !newEdu.start_date) {
      showToast('Please fill in institution, degree, and start date', 'error');
      return;
    }
    try {
      await addEducation(newEdu);
      setShowEduForm(false);
      setNewEdu({ institution: '', degree: '', start_date: '', end_date: '' });
      fetchProfile();
      showToast('Education added successfully!', 'success');
    } catch (e) {
      showToast('Error adding education', 'error');
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('Delete this education?')) return;
    try {
      await deleteEducation(id);
      fetchProfile();
      showToast('Education deleted', 'info');
    } catch (e) {
      showToast('Error deleting education', 'error');
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      await addSkill({ name: newSkill.trim(), category: 'General' });
      setNewSkill('');
      fetchProfile();
    } catch (e) {
      showToast('Error adding skill', 'error');
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
      showToast('Error deleting skill', 'error');
    }
  };

  const handleParseCV = async () => {
    if (!importText.trim()) return;
    setIsParsing(true);
    try {
      const data = await parseCvText(importText);
      setParsedData(data);
      showToast('CV parsed! Review the data below and click "Apply to Profile".', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to parse CV. Try again.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyParsed = async () => {
    if (!parsedData) return;
    setIsParsing(true);
    try {
      // Save personal info
      const profileUpdate = {
        full_name: parsedData.full_name || profile.fullName,
        contact_email: parsedData.contact_email || profile.email,
        phone: parsedData.phone || profile.phone,
        location: parsedData.location || profile.location,
        linkedin_url: parsedData.linkedin_url || profile.linkedin_url,
        professional_summary: parsedData.professional_summary || profile.professionalSummary
      };
      await updateMasterProfile(profileUpdate);

      // Add skills
      const skillPromises = (parsedData.skills || []).slice(0, 30).map(name =>
        addSkill({ name: String(name).trim(), category: 'General' }).catch(() => null)
      );

      // Add experiences
      const expPromises = (parsedData.experiences || []).slice(0, 10).map(exp =>
        addExperience({
          company: exp.company,
          role: exp.role,
          start_date: exp.start_date || '2020-01-01',
          end_date: exp.end_date || null,
          description: exp.description || '',
          responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : []
        }).catch(() => null)
      );

      // Add educations
      const eduPromises = (parsedData.educations || []).slice(0, 5).map(edu =>
        addEducation({
          institution: edu.institution,
          degree: edu.degree,
          start_date: edu.start_date || '2010-01-01',
          end_date: edu.end_date || null
        }).catch(() => null)
      );

      await Promise.all([...skillPromises, ...expPromises, ...eduPromises]);
      await fetchProfile();
      setShowImportModal(false);
      setImportText('');
      setParsedData(null);
      showToast('Profile populated from CV!', 'success');
    } catch (err) {
      showToast('Error applying parsed data', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const isProfileReady = experiences.length > 0 && skills.length > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'minmax(0, 1fr) 280px', direction: 'ltr' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={32} color="#818cf8" /> Master Profile
          </h1>
          <button
            className="btn btn-secondary"
            onClick={() => { setShowImportModal(true); setParsedData(null); setImportText(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Upload size={18} /> Import from CV
          </button>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <Info size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            This is your full information repository. The AI will pull the most relevant details from here for each job. Fill as much as possible!
          </p>
        </div>

        {/* Personal Details */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: 0 }}>Personal Details</h2>
            <button className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }} onClick={handleSaveInfo} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Details'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" name="fullName" value={profile.fullName} onChange={handleInputChange} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input type="email" className="form-input" name="email" value={profile.email} onChange={handleInputChange} placeholder="john@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="text" className="form-input" name="phone" value={profile.phone} onChange={handleInputChange} placeholder="+1-123-456-7890" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} /> Location
              </label>
              <input type="text" className="form-input" name="location" value={profile.location} onChange={handleInputChange} placeholder="New York, USA" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Linkedin size={14} /> LinkedIn URL
            </label>
            <input type="url" className="form-input" name="linkedin_url" value={profile.linkedin_url} onChange={handleInputChange} placeholder="https://linkedin.com/in/yourprofile" dir="ltr" style={{ textAlign: 'left' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Professional Summary</label>
            <textarea className="form-textarea" name="professionalSummary" value={profile.professionalSummary} onChange={handleInputChange} placeholder="Briefly describe your background and career goals..." />
          </div>
        </section>

        {/* Experience Section */}
        <section className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={22} /> Work Experience
            </h2>
            {!showExpForm && (
              <button className="btn btn-secondary" onClick={() => setShowExpForm(true)}>
                <Plus size={18} /> Add Experience
              </button>
            )}
          </div>

          {showExpForm && (
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Add Work Experience</h3>
                <button onClick={() => setShowExpForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Company *</label><input type="text" className="form-input" value={newExp.company} onChange={e => setNewExp({ ...newExp, company: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Role *</label><input type="text" className="form-input" value={newExp.role} onChange={e => setNewExp({ ...newExp, role: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Start Date *</label><input type="date" className="form-input" value={newExp.start_date} onChange={e => setNewExp({ ...newExp, start_date: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">End Date (empty = Present)</label><input type="date" className="form-input" value={newExp.end_date} onChange={e => setNewExp({ ...newExp, end_date: e.target.value })} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Short Description</label>
                <input type="text" className="form-input" value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Responsibilities (One per line — crucial for AI!)</label>
                <textarea className="form-textarea" value={newExp.responsibilities} onChange={e => setNewExp({ ...newExp, responsibilities: e.target.value })} placeholder="Developed a complex system with React...&#10;Led a team of 5 developers...&#10;Improved performance by 40%..." style={{ minHeight: '140px' }} />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddExperience}>Save Experience</button>
            </div>
          )}

          {experiences.length === 0 && !showExpForm ? (
            <div style={{ padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No work experience yet. Add at least one role so the AI can work.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {experiences.map(exp => (
                <div key={exp.id} style={{ background: 'rgba(15,23,42,0.5)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.2rem 0' }}>{exp.role} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>at</span> {exp.company}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#c084fc', marginBottom: '0.5rem' }}>
                      {new Date(exp.start_date).toLocaleDateString('en-US')} – {exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US') : 'Present'}
                    </p>
                    {exp.description && <p style={{ margin: 0, fontSize: '0.9rem' }}>{exp.description}</p>}
                  </div>
                  <button onClick={() => handleDeleteExp(exp.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem', flexShrink: 0 }}>
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
              <GraduationCap size={22} /> Education
            </h2>
            {!showEduForm && (
              <button className="btn btn-secondary" onClick={() => setShowEduForm(true)}>
                <Plus size={18} /> Add Education
              </button>
            )}
          </div>

          {showEduForm && (
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--surface-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Add Education</h3>
                <button onClick={() => setShowEduForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Degree / Diploma *</label><input type="text" className="form-input" value={newEdu.degree} onChange={e => setNewEdu({ ...newEdu, degree: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Institution *</label><input type="text" className="form-input" value={newEdu.institution} onChange={e => setNewEdu({ ...newEdu, institution: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Start Date *</label><input type="date" className="form-input" value={newEdu.start_date} onChange={e => setNewEdu({ ...newEdu, start_date: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-input" value={newEdu.end_date} onChange={e => setNewEdu({ ...newEdu, end_date: e.target.value })} /></div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddEducation}>Save Education</button>
            </div>
          )}

          {educations.length === 0 && !showEduForm ? (
            <div style={{ padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--surface-border)', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No education data.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {educations.map(edu => (
                <div key={edu.id} style={{ background: 'rgba(15,23,42,0.5)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.2rem 0' }}>{edu.degree}</h3>
                    <p style={{ margin: '0 0 0.3rem 0', color: 'var(--text-muted)' }}>{edu.institution}</p>
                    <p style={{ fontSize: '0.85rem', color: '#c084fc', marginBottom: 0 }}>
                      {new Date(edu.start_date).toLocaleDateString('en-US')} – {edu.end_date ? new Date(edu.end_date).toLocaleDateString('en-US') : 'Present'}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteEducation(edu.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Skills Section */}
        <section className="glass-panel">
          <h2 style={{ marginBottom: '1.25rem' }}>Skills</h2>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Type a skill (e.g., React, Python, Teamwork)..."
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
              <Plus size={18} /> Add
            </button>
          </div>
          {skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Add at least one skill so the AI can filter.</p>
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

      {/* Import CV Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={22} color="#818cf8" /> Import from Existing CV
              </h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Paste the text of your existing CV. The AI will extract your details and populate your profile automatically.
            </p>

            {!parsedData ? (
              <>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '260px', marginBottom: '1rem' }}
                  placeholder="Paste your CV text here..."
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={handleParseCV}
                  disabled={isParsing || !importText.trim()}
                >
                  {isParsing
                    ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Parsing with AI...</>
                    : <><Upload size={18} /> Parse CV</>}
                </button>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>AI found the following data:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                    {parsedData.full_name && <span><strong>Name:</strong> {parsedData.full_name}</span>}
                    {parsedData.contact_email && <span><strong>Email:</strong> {parsedData.contact_email}</span>}
                    {parsedData.phone && <span><strong>Phone:</strong> {parsedData.phone}</span>}
                    {parsedData.location && <span><strong>Location:</strong> {parsedData.location}</span>}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <span><strong>Skills:</strong> {(parsedData.skills || []).length}</span>
                    {' · '}
                    <span><strong>Experiences:</strong> {(parsedData.experiences || []).length}</span>
                    {' · '}
                    <span><strong>Education:</strong> {(parsedData.educations || []).length}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setParsedData(null)} disabled={isParsing}>
                    Back
                  </button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleApplyParsed} disabled={isParsing}>
                    {isParsing
                      ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Applying...</>
                      : 'Apply to Profile'}
                  </button>
                </div>
              </>
            )}
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Sidebar */}
      <div>
        <div className="glass-panel" style={{ position: 'sticky', top: '5.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            Profile Status
          </h3>

          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { label: 'Personal Details', done: !!profile.fullName },
              { label: `Work Experience (${experiences.length})`, done: experiences.length > 0 },
              { label: `Skills (${skills.length})`, done: skills.length > 0 },
              { label: `Education (${educations.length})`, done: educations.length > 0 },
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
                Profile ready! Go to "Apply for Role" to generate a CV.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>
                Add at least one experience and one skill to activate AI.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
