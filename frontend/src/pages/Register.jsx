import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, fullName);
      showToast(`Welcome, ${fullName}! Your account has been created.`, 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed, please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-panel animate-fade-in">

        {/* Logo */}
        <div className="auth-logo">
          <Briefcase size={40} color="#818cf8" />
          <span className="brand-gradient">Smart CV</span>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.5rem' }}>Create Account</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Join us and start building smart CVs
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} dir="ltr">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="John Doe"
              autoComplete="name"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              autoComplete="email"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password (Min 6 characters)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                dir="ltr"
                style={{ textAlign: 'left', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.875rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating account...</>
              : <><UserPlus size={18} /> Register</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
            Login here
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Register;
