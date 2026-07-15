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
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
