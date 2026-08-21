// Thin JSON API client: all app endpoints share cookies + JSON conventions.
export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Some endpoints (or proxy errors) may not return JSON.
  }
  return { ok: response.ok, status: response.status, data };
}

// Convenience wrapper that throws a user-facing error on failure.
export async function apiOrThrow(path, options, fallbackMessage) {
  const { ok, data } = await api(path, options);
  if (!ok) throw new Error(data.error || fallbackMessage);
  return data;
}
