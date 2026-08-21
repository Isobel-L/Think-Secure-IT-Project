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
      if (!ok) throw new Error(data.error || '登录失败，请稍后重试。');
      onAuthed(data.user);
    } catch (requestError) {
      setError(requestError.message || '登录失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="账号登录">
      <form className="auth-card" onSubmit={submit}>
        <button className="auth-close" type="button" onClick={onClose} aria-label="关闭">
          <Icon name="close" size={15} />
        </button>
        <span className="service-badge">账号中心</span>
        <h2>{isRegister ? '注册天猫 AI 头像馆账号' : '登录天猫 AI 头像馆'}</h2>
        <p>登录后，生成记录会自动保存到你的账号中。</p>
        {isRegister && (
          <label>昵称
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="例如：Ziyun" />
          </label>
        )}
        <label>邮箱
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required />
        </label>
        <label>密码
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="至少 8 位" minLength="8" required />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" type="submit" disabled={loading}>{loading ? '处理中…' : isRegister ? '注册并登录' : '登录'}</button>
        <button className="google-button" type="button" onClick={() => { window.location.href = '/api/auth/google'; }}>使用 Google 账号登录</button>
        <button className="auth-switch" type="button" onClick={() => { onSwitchMode(isRegister ? 'login' : 'register'); setError(''); }}>
          {isRegister ? '已有账号？去登录' : '没有账号？注册一个'}
        </button>
      </form>
    </div>
  );
}
