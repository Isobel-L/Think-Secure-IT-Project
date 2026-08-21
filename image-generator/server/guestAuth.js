// Identity layer for the database-free build: no sign-up, no login, every request shares one guest.
// The original server/auth.js is still in the tree; restoring accounts only means switching the
// imports in server/index.js back.
import { Router } from 'express';

export const guestUser = Object.freeze({
  id: 'guest',
  email: '',
  displayName: '访客',
  avatarUrl: '',
  authProvider: 'guest',
  createdAt: null,
});

// Same slot as auth.js optionalAuth: mounted ahead of every /api route.
export function attachGuestUser(request, _response, next) {
  request.user = guestUser;
  return next();
}

// Everyone is a guest here, so this passes straight through and route signatures stay unchanged.
export function requireAuth(_request, _response, next) {
  return next();
}

function authDisabled(_request, response) {
  return response.status(501).json({
    code: 'AUTH_DISABLED',
    error: '当前为无数据库访客模式，登录 / 注册功能已停用。',
  });
}

export function createAuthRouter() {
  const router = Router();

  router.get('/me', (_request, response) => {
    response.json({ user: guestUser, databaseConfigured: false, guestMode: true });
  });

  // The UI no longer shows a logout button, but a cached older page should still get a clean success.
  router.post('/logout', (_request, response) => response.json({ ok: true }));

  for (const path of ['/register', '/login', '/password', '/google', '/google/callback']) {
    router.all(path, authDisabled);
  }
  router.patch('/profile', authDisabled);

  return router;
}
