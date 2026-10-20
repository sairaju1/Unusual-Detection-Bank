import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/UI.jsx';

// After login/register, App's logged-in routes take over, so no manual navigation is needed here.
export function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await login(form.email, form.password); }
    catch (ex) { setErr(ex); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Log in</h1>
        {err && <ErrorBox error={err} />}
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p className="muted">No account? <Link to="/register">Create one</Link></p>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setErr({ message: 'Passwords do not match.' });
    setBusy(true); setErr(null);
    try { await register(form.name, form.email, form.password); }
    catch (ex) { setErr(ex); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>Create account</h1>
        {err && <ErrorBox error={err} />}
        <form onSubmit={submit}>
          <label>Full name<input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password (min 8 characters)<input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Confirm password<input type="password" required minLength={8} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></label>
          <button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
