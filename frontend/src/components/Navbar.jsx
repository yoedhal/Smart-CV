import React from 'react';
import { NavLink } from 'react-router-dom';
import { Briefcase, User, Sparkles, History as HistoryIcon } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <NavLink to="/" className="navbar-brand">
          <Briefcase size={28} color="#818cf8" />
          <span style={{background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            Smart CV
          </span>
        </NavLink>
        
        <div className="nav-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <User size={18} /> Master Profile
          </NavLink>
          <NavLink 
            to="/job" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={18} /> Apply for Job
          </NavLink>
          <NavLink 
            to="/history" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <HistoryIcon size={18} /> History
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
