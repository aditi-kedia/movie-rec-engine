import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Film, User, LogOut, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-[#1c252d] border-b border-[#24303c] sticky top-0 z-50 shadow-md">
      {/* Visual Accent bar inspired by Letterboxd (Orange, Green, Blue) */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ff8000] via-[#00c030] to-[#40bcf4]" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-wider text-white hover:opacity-90">
              <Film className="h-6 w-6 text-[#00c030]" />
              <span>FILM<span className="text-[#ff8000]">REC</span></span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-1.5 text-sm font-semibold text-[#9ab] hover:text-white transition-colors py-2 px-1"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <Link 
              to="/profile" 
              className="flex items-center gap-1.5 text-sm font-semibold text-[#9ab] hover:text-white transition-colors py-2 px-1"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </Link>

            {/* Profile Pill & Logout */}
            <div className="flex items-center gap-3 pl-4 border-l border-[#24303c]">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-white leading-none">{user.username}</p>
                <p className="text-xs text-[#9ab] leading-none mt-1">{user.email}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-lg bg-[#24303c] hover:bg-[#ff8000]/10 text-[#9ab] hover:text-[#ff8000] transition-all"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
