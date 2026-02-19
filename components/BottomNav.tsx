
// Added React import to resolve missing namespace error
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const activeTab = location.pathname;

  // Do not show bottom nav on scan or review screens
  if (activeTab === '/scan' || activeTab === '/review') return null;

  // Logic: Only show the FAB (camera button) on the Dashboard page
  const showFab = activeTab === '/dashboard';

  const tabs = [
    { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { path: '/expenses', label: 'Expenses', icon: 'receipt_long' },
    { path: '/projects', label: 'Projects', icon: 'folder_open' },
    { path: '/profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pointer-events-none">
      {/* Floating Action Button (Camera) - Only show on Dashboard */}
      {showFab && (
        <div className="relative w-full h-0">
          <div className="absolute bottom-4 right-6 pointer-events-auto">
            <Link
              to="/scan"
              className="w-[68px] h-[68px] bg-[#D4AF37] rounded-full shadow-[0_12px_30px_rgba(212,175,55,0.5)] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-300 relative overflow-hidden group border-2 border-[#E5C155]/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50"></div>
              <div className="absolute inset-[4px] rounded-full border border-white/20"></div>
              <span className="material-symbols-outlined relative z-10 drop-shadow-md fill-1" style={{ fontSize: '34px' }}>
                photo_camera
              </span>
            </Link>
          </div>
        </div>
      )}

      <nav className="bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-9 pt-4 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] pointer-events-auto">
        <div className="flex justify-between items-center w-full px-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center gap-1.5 group w-16 transition-all duration-200 ${isActive ? 'text-[#D4AF37] scale-105' : 'text-gray-400'
                  }`}
              >
                <span className={`material-symbols-outlined text-[28px] ${isActive ? 'fill-1' : ''}`}>
                  {tab.icon}
                </span>
                <span className={`text-[11px] font-bold tracking-tight`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
