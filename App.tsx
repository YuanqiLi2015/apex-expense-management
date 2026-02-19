
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './views/Dashboard';
import Expenses from './views/Expenses';
import Projects from './views/Projects';
import Profile from './views/Profile';
import ProjectDetails from './views/ProjectDetails';
import Scan from './views/Scan';
import Review from './views/Review';
import SubmitSuccess from './views/SubmitSuccess';
import BottomNav from './components/BottomNav';
import { AppProvider } from './context/AppContext';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white shadow-2xl relative">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/review" element={<Review />} />
            <Route path="/submit-success" element={<SubmitSuccess />} />
          </Routes>
          <BottomNav />
        </div>
      </Router>
    </AppProvider>
  );
};

export default App;
