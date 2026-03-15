import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import bangaPhoto from '../assets/Banga,_Calamba,_Laguna,_March_2023.jpg';
import cdrrmdLogo from '../assets/cdrrmd-logo.png';

type Props = {
  onLoggedIn: (token: string) => void;
};

export default function LoginPage({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: username, password });
      onLoggedIn(data.token);
    } catch {
      setError('Login failed. Check username/password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-[#2f3237]">
      <div className="grid min-h-dvh w-full overflow-hidden bg-white md:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-center bg-[#f3f4f6] px-6 py-10 sm:px-10 md:px-16">
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.32em] text-slate-500">Login Page</p>
          <h1 className="mb-10 text-[clamp(2rem,5vw,3rem)] font-black tracking-tight text-[#12314b]">WELCOME BACK!</h1>

          <form onSubmit={onSubmit} className="w-full max-w-[min(560px,100%)] space-y-5">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username or Email"
              className="h-12 w-full rounded-full border border-[#7b8aa0] bg-white px-5 text-sm text-slate-700 shadow-[0_3px_6px_rgba(15,41,72,0.18)] outline-none transition focus:border-[#11314b]"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="h-12 w-full rounded-full border border-[#7b8aa0] bg-white px-5 text-sm text-slate-700 shadow-[0_3px_6px_rgba(15,41,72,0.18)] outline-none transition focus:border-[#11314b]"
            />

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#1f3c54]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-400 text-[#12314b]"
              />
              Remember me
            </label>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <button
              disabled={loading}
              className="h-12 w-full rounded-full bg-[#12314b] text-base font-bold text-white shadow-[0_4px_8px_rgba(18,49,75,0.35)] transition hover:bg-[#0e2a40] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>

          </form>
        </section>

        <section className="relative hidden min-h-dvh items-center justify-center bg-[#0f3558] md:flex">
          <img
            src={bangaPhoto}
            alt="Calamba monument"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f5f93]/45 to-[#0b2740]/70" />

          <div className="relative z-10 flex max-w-sm flex-col items-center text-center text-white">
            <img
              src={cdrrmdLogo}
              alt="CDRRMD logo"
              className="mb-5 h-36 w-36 rounded-full border-[6px] border-[#f6d84c] bg-white object-cover shadow-xl"
            />
            <p className="text-[2.1rem] font-black leading-tight">City Disaster Risk Reduction</p>
            <p className="text-[2.1rem] font-black leading-tight">and Management Division</p>
          </div>
        </section>
      </div>
    </div>
  );
}
