const RATE_LIMIT_SWEEP_INTERVAL_MS = 60_000;

export function securityHeaders(_request, response, next) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

/**
 * Small in-memory sliding-window rate limiter, keyed by user id (falls back
 * to the client IP for unauthenticated requests). Suitable for the current
 * single-process deployment; swap for a shared store if the API is scaled out.
 */
export function createRateLimiter({ windowMs = 60_000, max = 10, code = 'RATE_LIMITED', message = 'Too many requests. Please try again shortly.' } = {}) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits) {
      const alive = timestamps.filter((time) => now - time < windowMs);
      if (alive.length) hits.set(key, alive);
      else hits.delete(key);
    }
  }, RATE_LIMIT_SWEEP_INTERVAL_MS);
  sweep.unref?.();

  return function rateLimit(request, response, next) {
    const key = request.user?.id || request.ip || 'anonymous';
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter((time) => now - time < windowMs);

    if (timestamps.length >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - timestamps[0])) / 1000));
      response.setHeader('Retry-After', String(retryAfterSeconds));
      return response.status(429).json({ code, error: message });
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    return next();
  };
}
