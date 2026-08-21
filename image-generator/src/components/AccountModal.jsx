import { useState } from 'react';
import { api } from '../api.js';
import { Icon } from './Icons.jsx';

export default function AccountModal({ user, onClose, onUpdated }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const isGoogleUser = user.authProvider === 'google';

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const { ok, data } = await api('/api/auth/profile', {
        method: 'PATCH',
        body: { displayName },
      });
      if (!ok) throw new Error(data.error || '昵称保存失败，请稍后重试。');
      setDisplayName(data.user.displayName || '');
      onUpdated(data.user);
      setProfileSuccess('昵称已保存。');
    } catch (requestError) {
      setProfileError(requestError.message || '昵称保存失败，请稍后重试。');
    } finally {
      setProfileLoading(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      const { ok, data } = await api('/api/auth/password', {
        method: 'POST',
        body: passwords,
      });
      if (!ok) throw new Error(data.error || '密码修改失败，请稍后重试。');
      setPasswords({ currentPassword: '', newPassword: '' });
      setPasswordSuccess('密码已更新，下次请使用新密码登录。');
    } catch (requestError) {
      setPasswordError(requestError.message || '密码修改失败，请稍后重试。');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="账号中心">
      <div className="auth-card account-card">
        <button className="auth-close" type="button" onClick={onClose} aria-label="关闭">
          <Icon name="close" size={15} />
        </button>
        <span className="service-badge">账号中心</span>
        <h2>管理你的账号</h2>
        <p>修改展示昵称或更新登录密码。</p>

        <div className="account-summary">
          <div><span>邮箱</span><strong>{user.email}</strong></div>
          <div><span>登录方式</span><strong>{isGoogleUser ? 'Google 账号' : '邮箱密码'}</strong></div>
        </div>

        <form className="account-section" onSubmit={saveProfile}>
          <h3>修改昵称</h3>
          <label>昵称
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength="80"
              required
            />
          </label>
          {profileError && <div className="auth-error">{profileError}</div>}
          {profileSuccess && <div className="auth-success">{profileSuccess}</div>}
          <button className="auth-submit" type="submit" disabled={profileLoading}>
            {profileLoading ? '保存中…' : '保存昵称'}
          </button>
        </form>

        <div className="account-divider" />

        {isGoogleUser ? (
          <div className="account-google-note">Google 登录账号无需密码。</div>
        ) : (
          <form className="account-section" onSubmit={savePassword}>
            <h3>修改密码</h3>
            <label>当前密码
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                autoComplete="current-password"
                required
              />
            </label>
            <label>新密码
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                autoComplete="new-password"
                minLength="8"
                maxLength="128"
                placeholder="至少 8 位"
                required
              />
            </label>
            {passwordError && <div className="auth-error">{passwordError}</div>}
            {passwordSuccess && <div className="auth-success">{passwordSuccess}</div>}
            <button className="auth-submit" type="submit" disabled={passwordLoading}>
              {passwordLoading ? '更新中…' : '更新密码'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
