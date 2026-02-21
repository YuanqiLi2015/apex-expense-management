
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './views/Dashboard';
import Expenses from './views/Expenses';
import Projects from './views/Projects';
import Profile from './views/Profile';
import ProjectDetails from './views/ProjectDetails';
import Scan from './views/Scan';
import Review from './views/Review';
import SubmitSuccess from './views/SubmitSuccess';
import Login from './views/Login';
import Register from './views/Register';
import BottomNav from './components/BottomNav';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Route guard component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-[#d4af35] to-[#c9a732] flex items-center justify-center shadow-fab">
            <span className="material-symbols-outlined text-white text-[28px] fill-1">diamond</span>
          </div>
          <div className="w-8 h-8 border-3 border-[#d4af35] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null; // AuthGate handles redirect
  return <>{children}</>;
};

// Auth gate: shows Login/Register if not authenticated, app if authenticated
const AuthGate: React.FC = () => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-[#d4af35] to-[#c9a732] flex items-center justify-center shadow-fab">
            <span className="material-symbols-outlined text-white text-[28px] fill-1">diamond</span>
          </div>
          <div className="w-8 h-8 border-3 border-[#d4af35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'register') {
      return <Register onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthMode('register')} />;
  }

  // User is authenticated — show the app
  return (
    <AppProvider>
      <Router>
        <div className="flex flex-col h-screen h-[100dvh] w-full max-w-screen-2xl mx-auto bg-white shadow-2xl relative overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
            <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
            <Route path="/submit-success" element={<ProtectedRoute><SubmitSuccess /></ProtectedRoute>} />
          </Routes>
          <BottomNav />
        </div>
      </Router>
    </AppProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
};

export default App;
