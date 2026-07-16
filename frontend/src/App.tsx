import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { PreferenceForm } from './pages/PreferenceForm';
import { RoomDetail } from './pages/RoomDetail';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#14181c] text-white flex flex-col font-sans">
          <Navbar />
          <div className="flex-1 w-full">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/preferences" element={<PreferenceForm />} />
                <Route path="/rooms/:id" element={<RoomDetail />} />
              </Route>

              {/* Fallback Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1c252d] border-t border-[#24303c] py-6 text-xs text-[#9ab] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white tracking-wider">FILM<span className="text-[#ff8000]">REC</span></span>
          <span className="text-[10px] text-[#9ab]/50">|</span>
          <span>&copy; {new Date().getFullYear()} Movie Recommendation Engine.</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left">
          <img 
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
            alt="TMDb Logo" 
            className="h-4 w-auto object-contain max-w-[120px] mx-auto md:mx-0"
          />
          <span className="max-w-sm sm:max-w-md text-[10px] leading-relaxed text-[#9ab]/70">
            This product uses the TMDb API but is not endorsed or certified by TMDb.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default App;
