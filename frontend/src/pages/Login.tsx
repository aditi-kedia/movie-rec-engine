import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Film, Mail, Lock, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log in. Please check your credentials.");
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
            <div className="p-3 bg-[#24303c] rounded-2xl text-[#00c030]">
              <Film className="h-10 w-10" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
            Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff8000] via-[#00c030] to-[#40bcf4]">FilmRec</span>
          </h2>
          <p className="mt-2 text-sm text-[#9ab]">
            Sign in to access your dashboard and groups
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
              <label htmlFor="email-address" className="block text-xs font-bold uppercase tracking-wider text-[#9ab] mb-2">
                Username or Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#9ab] pointer-events-none">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  id="email-address"
                  name="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-[#24303c] border border-[#303840] rounded-lg text-white placeholder-[#9ab]/50 focus:outline-none focus:border-[#00c030] transition-colors text-sm"
                  placeholder="Username or email"
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
                  className="block w-full pl-10 pr-4 py-3 bg-[#24303c] border border-[#303840] rounded-lg text-white placeholder-[#9ab]/50 focus:outline-none focus:border-[#00c030] transition-colors text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-[#00c030] hover:bg-[#00a828] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00c030] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#9ab]">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-[#00c030] hover:text-[#00a828] transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
