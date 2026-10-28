import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleCheck, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { api } from '../api.js';

export function AuthPage({ mode, onAuth }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = isRegister ? await api.register(form) : await api.login({ email: form.email, password: form.password });
      onAuth(result.data.user);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-story">
      <Link to="/login" className="brand brand-light"><span className="brand-mark">T</span><span>taskmate</span></Link>
      <div className="story-content">
        <div className="eyebrow light-eyebrow"><Sparkles size={14} /> A little more room to think</div>
        <h1>Make space for<br /><em>what matters.</em></h1>
        <p>Your plans, priorities, and progress — all in one calm place.</p>
        <div className="story-note"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><b>+</b></div><span>A clearer day starts here.</span><CircleCheck size={17} /></div>
      </div>
      <div className="story-bottom"><span>© 2025 TaskMate</span><span>Small steps count.</span></div>
      <div className="story-orb orb-one" /><div className="story-orb orb-two" />
    </section>
    <section className="auth-form-side">
      <div className="auth-mobile-brand brand"><span className="brand-mark">T</span><span>taskmate</span></div>
      <div className="auth-card">
        <div className="auth-heading"><div className="eyebrow">YOUR PERSONAL WORKSPACE</div><h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2><p>{isRegister ? 'Start turning your plans into progress.' : 'Pick up right where you left off.'}</p></div>
        <form onSubmit={submit} className="auth-fields">
          {isRegister && <label className="field"><span>Your name</span><div className="input-wrap"><input autoComplete="name" value={form.name} onChange={change('name')} placeholder="e.g. Alex Morgan" required minLength={2} maxLength={80} /><span className="field-check"><Check size={15} /></span></div></label>}
          <label className="field"><span>Email address</span><div className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={form.email} onChange={change('email')} placeholder="you@example.com" required maxLength={254} /></div></label>
          <label className="field"><span>Password</span><div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={change('password')} placeholder={isRegister ? 'At least 10 characters' : 'Enter your password'} required minLength={isRegister ? 10 : 1} maxLength={128} /><button className="text-button" type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          {isRegister && <label className="field"><span>Confirm password</span><div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={change('confirmPassword')} placeholder="Type it once more" required minLength={10} maxLength={128} /></div></label>}
          {error && <div role="alert" className="form-error">{error}</div>}
          <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></button>
        </form>
        <div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to TaskMate?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></div>
        <div className="auth-assurance"><span className="assurance-icon"><LockKeyhole size={14} /></span>Your tasks are private and secure.</div>
      </div>
      <div className="auth-footer">Thoughtfully simple, just for you.</div>
    </section>
  </main>;
}
