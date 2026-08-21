import { useState } from 'react';
import { api } from '../api.js';
import { Icon } from './Icons.jsx';

export default function AuthModal({ mode, onSwitchMode, onClose, onAuthed }) {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRegister = mode === 'register';

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { ok, data } = await api(`/api/auth/${isRegister ? 'register' : 'login'}`, { method: 'POST', body: form });
      if (!ok) throw new Error(data.error || 'Sign-in failed. Please try again.');
      onAuthed(data.user);
    } catch (requestError) {
      setError(requestError.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Sign in">
      <form className="auth-card" onSubmit={submit}>
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={15} />
        </button>
        <span className="service-badge">Account</span>
        <h2>{isRegister ? 'Create a Tmall AI Avatar Studio account' : 'Sign in to Tmall AI Avatar Studio'}</h2>
        <p>Sign in and your generations are saved to your account automatically.</p>
        {isRegister && (
          <label>Display name
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="For example: Ziyun" />
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required />
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" minLength="8" required />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Working…' : isRegister ? 'Create account' : 'Sign in'}</button>
        <button className="google-button" type="button" onClick={() => { window.location.href = '/api/auth/google'; }}>Continue with Google</button>
        <button className="auth-switch" type="button" onClick={() => { onSwitchMode(isRegister ? 'login' : 'register'); setError(''); }}>
          {isRegister ? 'Already have an account? Sign in' : 'No account yet? Create one'}
        </button>
      </form>
    </div>
  );
}
