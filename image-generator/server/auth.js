import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import {
  createEmailUser,
  findUserByEmail,
  findUserById,
  isDatabaseConfigured,
  toPublicUser,
  updateUserDisplayName,
  updateUserPassword,
  upsertGoogleUser,
} from './db.js';

const sessionCookieName = 'tmall_avatar_session';
const googleStateCookieName = 'tmall_google_oauth_state';
const sessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-only-change-this-jwt-secret';
}

function frontendBaseUrl() {
  return (process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5173').replace(/\/+$/, '');
}

function apiBaseUrl() {
  return (process.env.PUBLIC_API_BASE_URL || `http://127.0.0.1:${Number(process.env.PORT) || 8787}`).replace(/\/+$/, '');
}

function cookieOptions(maxAge = sessionMaxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge,
    path: '/',
  };
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function signSession(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    jwtSecret(),
    { expiresIn: '30d', issuer: 'tmall-ai-avatar-gallery' },
  );
}

function setSessionCookie(response, user) {
  response.cookie(sessionCookieName, signSession(user), cookieOptions());
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, { ...cookieOptions(0), maxAge: 0 });
}

export async function optionalAuth(request, _response, next) {
  const token = request.cookies?.[sessionCookieName];
  if (!token || !isDatabaseConfigured()) return next();

  try {
    const payload = jwt.verify(token, jwtSecret(), { issuer: 'tmall-ai-avatar-gallery' });
    const user = await findUserById(payload.sub);
    request.user = user || null;
  } catch {
    request.user = null;
  }

  return next();
}

export function requireAuth(request, response, next) {
  if (!isDatabaseConfigured()) {
    return response.status(503).json({ code: 'DATABASE_NOT_CONFIGURED', error: '账号数据库尚未配置，请先启动 Docker Postgres 并设置 DATABASE_URL。' });
  }
  if (!request.user) {
    return response.status(401).json({ code: 'AUTH_REQUIRED', error: '请先登录账号。' });
  }
  return next();
}

function ensureDatabase(response) {
  if (isDatabaseConfigured()) return true;
  response.status(503).json({ code: 'DATABASE_NOT_CONFIGURED', error: '账号数据库尚未配置，请先启动 Docker Postgres 并设置 DATABASE_URL。' });
  return false;
}

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function googleRedirectUri() {
  return `${apiBaseUrl()}/api/auth/google/callback`;
}

export function createAuthRouter() {
  const router = Router();

  router.get('/me', (request, response) => {
    response.json({ user: request.user ? toPublicUser(request.user) : null, databaseConfigured: isDatabaseConfigured() });
  });

  router.patch('/profile', requireAuth, async (request, response) => {
    if (!ensureDatabase(response)) return;
    const displayName = cleanText(request.body?.displayName, 80);
    if (!displayName) {
      return response.status(400).json({ code: 'INVALID_DISPLAY_NAME', error: '昵称不能为空。' });
    }
    const user = await updateUserDisplayName({ userId: request.user.id, displayName });
    if (!user) return response.status(404).json({ code: 'USER_NOT_FOUND', error: '没有找到该账号。' });
    return response.json({ user: toPublicUser(user) });
  });

  router.post('/password', requireAuth, async (request, response) => {
    if (!ensureDatabase(response)) return;
    const user = await findUserById(request.user.id);
    if (!user?.password_hash) {
      return response.status(400).json({ code: 'PASSWORD_NOT_SET', error: 'Google 登录账号未设置密码。' });
    }

    const currentPasswordMatches = await bcrypt.compare(request.body?.currentPassword || '', user.password_hash);
    if (!currentPasswordMatches) {
      return response.status(401).json({ code: 'INVALID_CREDENTIALS', error: '当前密码不正确。' });
    }

    const newPassword = request.body?.newPassword;
    if (!validatePassword(newPassword)) {
      return response.status(400).json({ code: 'INVALID_PASSWORD', error: '新密码长度至少 8 位，最多 128 位。' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await updateUserPassword({ userId: user.id, passwordHash });
    return response.json({ ok: true });
  });

  router.post('/register', async (request, response) => {
    if (!ensureDatabase(response)) return;

    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password;
    const displayName = cleanText(request.body?.displayName, 80) || email.split('@')[0] || '头像用户';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({ code: 'INVALID_EMAIL', error: '请输入有效邮箱。' });
    }
    if (!validatePassword(password)) {
      return response.status(400).json({ code: 'INVALID_PASSWORD', error: '密码长度至少 8 位，最多 128 位。' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return response.status(409).json({ code: 'EMAIL_EXISTS', error: '该邮箱已注册，请直接登录。' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createEmailUser({ email, displayName, passwordHash });
    setSessionCookie(response, user);
    return response.status(201).json({ user: toPublicUser(user) });
  });

  router.post('/login', async (request, response) => {
    if (!ensureDatabase(response)) return;

    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password;
    const user = await findUserByEmail(email);

    if (!user?.password_hash) {
      return response.status(401).json({ code: 'INVALID_CREDENTIALS', error: '邮箱或密码不正确。' });
    }

    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) {
      return response.status(401).json({ code: 'INVALID_CREDENTIALS', error: '邮箱或密码不正确。' });
    }

    setSessionCookie(response, user);
    return response.json({ user: toPublicUser(user) });
  });

  router.post('/logout', (_request, response) => {
    clearSessionCookie(response);
    response.json({ ok: true });
  });

  router.get('/google', (request, response) => {
    if (!ensureDatabase(response)) return;
    if (!googleConfigured()) {
      return response.status(503).json({ code: 'GOOGLE_AUTH_NOT_CONFIGURED', error: 'Google 登录尚未配置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET。' });
    }

    const state = crypto.randomBytes(24).toString('hex');
    response.cookie(googleStateCookieName, state, cookieOptions(10 * 60 * 1000));

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });
    return response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  router.get('/google/callback', async (request, response) => {
    try {
      if (!isDatabaseConfigured()) throw new Error('账号数据库尚未配置。');
      if (!googleConfigured()) throw new Error('Google 登录尚未配置。');

      const expectedState = request.cookies?.[googleStateCookieName];
      const actualState = request.query?.state;
      if (!expectedState || expectedState !== actualState) throw new Error('Google 登录状态校验失败。');

      const code = request.query?.code;
      if (!code) throw new Error('Google 未返回授权码。');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: googleRedirectUri(),
          grant_type: 'authorization_code',
        }),
      });
      const tokenPayload = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenPayload.error_description || tokenPayload.error || 'Google token exchange failed.');

      const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { authorization: `Bearer ${tokenPayload.access_token}` },
      });
      const profile = await userInfoResponse.json();
      if (!userInfoResponse.ok || !profile.email) throw new Error('无法读取 Google 账号资料。');

      const user = await upsertGoogleUser({
        email: profile.email,
        displayName: profile.name || profile.email.split('@')[0],
        avatarUrl: profile.picture || '',
        googleSub: profile.sub,
      });

      response.clearCookie(googleStateCookieName, { ...cookieOptions(0), maxAge: 0 });
      setSessionCookie(response, user);
      return response.redirect(`${frontendBaseUrl()}?auth=google-success`);
    } catch (error) {
      console.error('[google-auth]', error);
      response.clearCookie(googleStateCookieName, { ...cookieOptions(0), maxAge: 0 });
      return response.redirect(`${frontendBaseUrl()}?auth=google-error`);
    }
  });

  return router;
}
