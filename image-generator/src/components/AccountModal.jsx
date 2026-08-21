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
      if (!ok) throw new Error(data.error || 'The display name could not be saved. Please try again.');
      setDisplayName(data.user.displayName || '');
      onUpdated(data.user);
      setProfileSuccess('Display name saved.');
    } catch (requestError) {
      setProfileError(requestError.message || 'The display name could not be saved. Please try again.');
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
      if (!ok) throw new Error(data.error || 'The password could not be changed. Please try again.');
      setPasswords({ currentPassword: '', newPassword: '' });
      setPasswordSuccess('Password updated. Use the new one next time you sign in.');
    } catch (requestError) {
      setPasswordError(requestError.message || 'The password could not be changed. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Account">
      <div className="auth-card account-card">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={15} />
        </button>
        <span className="service-badge">Account</span>
        <h2>Manage your account</h2>
        <p>Change your display name or update your password.</p>

        <div className="account-summary">
          <div><span>Email</span><strong>{user.email}</strong></div>
          <div><span>Sign-in method</span><strong>{isGoogleUser ? 'Google account' : 'Email and password'}</strong></div>
        </div>

        <form className="account-section" onSubmit={saveProfile}>
          <h3>Display name</h3>
          <label>Display name
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
            {profileLoading ? 'Saving…' : 'Save name'}
          </button>
        </form>

        <div className="account-divider" />

        {isGoogleUser ? (
          <div className="account-google-note">Google accounts do not use a password.</div>
        ) : (
          <form className="account-section" onSubmit={savePassword}>
            <h3>Change password</h3>
            <label>Current password
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                autoComplete="current-password"
                required
              />
            </label>
            <label>New password
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                autoComplete="new-password"
                minLength="8"
                maxLength="128"
                placeholder="At least 8 characters"
                required
              />
            </label>
            {passwordError && <div className="auth-error">{passwordError}</div>}
            {passwordSuccess && <div className="auth-success">{passwordSuccess}</div>}
            <button className="auth-submit" type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
