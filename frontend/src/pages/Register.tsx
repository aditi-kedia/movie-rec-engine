import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Film, Mail, Lock, User, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (username.length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await register({ username, email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Try using a different email/username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#14181c] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background decoration elements */}
      <div className="absolute top-12 left-12 w-64 h-64 bg-[#00c030]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-64 h-64 bg-[#ff8000]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 bg-[#1c252d] p-8 rounded-xl border border-[#24303c] shadow-2xl relative">
        {/* Title/Logo */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-[#24303c] rounded-2xl text-[#ff8000]">
              <Film className="h-10 w-10" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-[#9ab]">
            Join <span className="text-[#00c030] font-bold">FilmRec</span> today to create lists and matching rooms
          </p>
        </div>

        {errorMsg && (
          <div className="bg-[#ff8000]/10 border border-[#ff8000]/30 text-[#ff8000] text-sm p-4 rounded-lg">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-[#9ab] mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#9ab] pointer-events-none">
                  <User className="h-5 w-5" />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-[#24303c] border border-[#303840] rounded-lg text-white placeholder-[#9ab]/50 focus:outline-none focus:border-[#ff8000] transition-colors text-sm"
                  placeholder="movielover"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-address" className="block text-xs font-bold uppercase tracking-wider text-[#9ab] mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#9ab] pointer-events-none">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-[#24303c] border border-[#303840] rounded-lg text-white placeholder-[#9ab]/50 focus:outline-none focus:border-[#ff8000] transition-colors text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#9ab] mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#9ab] pointer-events-none">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-[#24303c] border border-[#303840] rounded-lg text-white placeholder-[#9ab]/50 focus:outline-none focus:border-[#ff8000] transition-colors text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-[#ff8000] hover:bg-[#e07000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff8000] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#9ab]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#ff8000] hover:text-[#e07000] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
