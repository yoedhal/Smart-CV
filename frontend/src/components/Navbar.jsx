import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Briefcase, User, Sparkles, History as HistoryIcon, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully.', 'info');
    navigate('/login');
    setShowUserMenu(false);
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        {/* Brand */}
        <NavLink to="/" className="navbar-brand">
          <Briefcase size={28} color="#818cf8" />
          <span className="brand-gradient">Smart CV</span>
        </NavLink>

        {/* Navigation Links */}
        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <User size={17} /> Profile
          </NavLink>
          <NavLink
            to="/job"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={17} /> Apply for Role
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <HistoryIcon size={17} /> History
          </NavLink>
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'transparent', border: '1px solid var(--surface-border)',
              borderRadius: '10px', padding: '0.45rem 0.85rem', cursor: 'pointer',
              color: 'var(--text-main)', transition: 'var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-border)'}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0
            }}>
              {initials}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'User'}
            </span>
            <ChevronDown size={15} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: showUserMenu ? 'rotate(180deg)' : 'none' }} />
          </button>

          {showUserMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setShowUserMenu(false)}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0,
                background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(12px)',
                border: '1px solid var(--surface-border)', borderRadius: '12px',
                padding: '0.5rem', minWidth: '180px', zIndex: 50,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-border)', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in as:</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.6rem 1rem', background: 'transparent', border: 'none',
                    borderRadius: '8px', color: '#ef4444', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 500, transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
