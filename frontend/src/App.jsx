import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/JobSearch';
import History from './pages/History';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="page-wrapper container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/job" element={<JobSearch />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
