import pg from 'pg';
import { getPlan } from './billing.js';
import { deleteImageFiles, readImage, saveImage } from './imageStore.js';
import { parseDataUrl } from './imageUtils.js';

const { Pool } = pg;
export const FREE_GENERATION_LIMIT = 5;
const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function shanghaiToday(now = new Date()) {
  const parts = Object.fromEntries(
    shanghaiDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateOnly(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    // node-postgres parses DATE columns as midnight in the server's local
    // timezone, so the local calendar components recover the stored date.
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return '';
}

function planDailyUsedForDate(dailyUsed, dailyDate, today) {
  return dateOnly(dailyDate) === today ? Math.max(0, Number(dailyUsed || 0)) : 0;
}

export function pickDeductionSource({ plan, dailyUsed = 0, freeUsed = 0, paidCredits = 0, today = shanghaiToday(), now = new Date() }) {
  const expiresAt = plan?.expiresAt ? new Date(plan.expiresAt) : null;
  const planActive = Boolean(expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt > now);
  const usedToday = planDailyUsedForDate(dailyUsed, plan?.dailyDate, today);
  if (planActive && (plan.unlimited || usedToday < Number(plan.dailyQuota))) return 'plan';
  if (Number(freeUsed) < FREE_GENERATION_LIMIT) return 'free';
  if (Number(paidCredits) > 0) return 'paid';
  return null;
}

const databaseUrl = process.env.DATABASE_URL || '';
const pool = databaseUrl
  ? new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })
  : null;

export function isDatabaseConfigured() {
  return Boolean(pool);
}

export async function query(sql, params = []) {
  if (!pool) throw new Error('DATABASE_URL is not configured.');
  return pool.query(sql, params);
}

export async function initializeDatabase() {
  if (!pool) {
    console.warn('[database] DATABASE_URL is not set. Auth and generation history are disabled.');
    return false;
  }

  await query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      auth_provider TEXT NOT NULL DEFAULT 'email',
      google_sub TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS avatar_generations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_generation_id UUID REFERENCES avatar_generations(id) ON DELETE SET NULL,
      image TEXT NOT NULL,
      image_file TEXT,
      thumb_file TEXT,
      prompt TEXT NOT NULL DEFAULT '',
      negative_prompt TEXT NOT NULL DEFAULT '',
      brief TEXT NOT NULL DEFAULT '',
      avoid TEXT NOT NULL DEFAULT '',
      selections JSONB NOT NULL DEFAULT '{}'::jsonb,
      strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      downloaded_at TIMESTAMPTZ,
      locked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE avatar_generations
      ADD COLUMN IF NOT EXISTS parent_generation_id UUID REFERENCES avatar_generations(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS image_file TEXT,
      ADD COLUMN IF NOT EXISTS thumb_file TEXT,
      ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_avatar_generations_user_created ON avatar_generations (user_id, created_at DESC);');
  await query('CREATE INDEX IF NOT EXISTS idx_avatar_generations_parent ON avatar_generations (parent_generation_id);');

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS free_generations_used INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS paid_generation_credits INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS plan_id TEXT,
      ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS plan_daily_used INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS plan_daily_date DATE,
      ADD COLUMN IF NOT EXISTS plan_cancelled_at TIMESTAMPTZ;
  `);

  await query(`
    UPDATE users AS account
    SET free_generations_used = LEAST($1, history.total)
    FROM (
      SELECT user_id, COUNT(*)::INTEGER AS total
      FROM avatar_generations
      GROUP BY user_id
    ) AS history
    WHERE account.id = history.user_id
      AND account.free_generations_used = 0;
  `, [FREE_GENERATION_LIMIT]);

  await query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'stripe',
      provider_session_id TEXT UNIQUE,
      provider_payment_id TEXT,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 1 CHECK (credits > 0),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
      fulfilled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query('ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS plan_id TEXT;');
  await query('ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS plan_action TEXT;');
  await query('ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_credits_check;');
  await query('ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_credits_check CHECK (credits >= 0);');

  await query('CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created ON payment_orders (user_id, created_at DESC);');

  await query(`
    CREATE TABLE IF NOT EXISTS generation_reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL CHECK (source IN ('free', 'paid')),
      status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'released')),
      generation_id UUID REFERENCES avatar_generations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      consumed_at TIMESTAMPTZ,
      released_at TIMESTAMPTZ
    );
  `);

  await query('ALTER TABLE generation_reservations DROP CONSTRAINT IF EXISTS generation_reservations_source_check;');
  await query("ALTER TABLE generation_reservations ADD CONSTRAINT generation_reservations_source_check CHECK (source IN ('free', 'paid', 'plan'));");

  await query('CREATE INDEX IF NOT EXISTS idx_generation_reservations_user_status ON generation_reservations (user_id, status, created_at DESC);');
  return true;
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    authProvider: row.auth_provider,
    createdAt: row.created_at,
  };
}

export async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] || null;
}

export async function updateUserDisplayName({ userId, displayName }) {
  const result = await query(
    `UPDATE users
     SET display_name = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, displayName],
  );
  return result.rows[0] || null;
}

export async function updateUserPassword({ userId, passwordHash }) {
  const result = await query(
    `UPDATE users
     SET password_hash = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, passwordHash],
  );
  return result.rows[0] || null;
}

export async function createEmailUser({ email, displayName, passwordHash }) {
  const result = await query(
    `INSERT INTO users (email, display_name, password_hash, auth_provider)
     VALUES ($1, $2, $3, 'email')
     RETURNING *`,
    [email.toLowerCase(), displayName, passwordHash],
  );
  return result.rows[0];
}

export async function upsertGoogleUser({ email, displayName, avatarUrl, googleSub }) {
  const result = await query(
    `INSERT INTO users (email, display_name, avatar_url, google_sub, auth_provider)
     VALUES ($1, $2, $3, $4, 'google')
     ON CONFLICT (email)
     DO UPDATE SET
       display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), users.display_name),
       avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), users.avatar_url),
       google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub),
       updated_at = NOW()
     RETURNING *`,
    [email.toLowerCase(), displayName, avatarUrl, googleSub],
  );
  return result.rows[0];
}

export function toPublicUser(row) {
  return publicUser(row);
}

export async function saveAvatarGeneration({ userId, image, prompt, negativePrompt, brief, avoid, selections, strategy, metadata, provider, model, reservationId, parentGenerationId }) {
  const { imageFile, thumbFile } = await saveImage(image);
  const params = [
    userId,
    parentGenerationId || null,
    '',
    imageFile,
    thumbFile,
    prompt || '',
    negativePrompt || '',
    brief || '',
    avoid || '',
    JSON.stringify(selections || {}),
    JSON.stringify(strategy || {}),
    JSON.stringify(metadata || {}),
    provider || '',
    model || '',
  ];
  const insertSql = `INSERT INTO avatar_generations
    (user_id, parent_generation_id, image, image_file, thumb_file, prompt, negative_prompt, brief, avoid, selections, strategy, metadata, provider, model)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13, $14)
   RETURNING id, parent_generation_id, image, image_file, thumb_file, prompt, negative_prompt, brief, avoid, selections, strategy, metadata, provider, model, downloaded_at, locked_at, created_at`;

  if (!reservationId) {
    const result = await query(insertSql, params);
    return normalizeGeneration(result.rows[0]);
  }

  if (!pool) throw new Error('DATABASE_URL is not configured.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reservationResult = await client.query(
      `SELECT id, status
       FROM generation_reservations
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [reservationId, userId],
    );
    if (reservationResult.rows[0]?.status !== 'reserved') {
      throw new Error('Generation reservation is no longer available.');
    }

    const result = await client.query(insertSql, params);
    await client.query(
      `UPDATE generation_reservations
       SET status = 'consumed', generation_id = $3, consumed_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [reservationId, userId, result.rows[0].id],
    );
    await client.query('COMMIT');
    return normalizeGeneration(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function listAvatarGenerations(userId, limit = 24) {
  const result = await query(
    `SELECT id, parent_generation_id, image, image_file, thumb_file, prompt, negative_prompt, brief, avoid, selections, strategy, metadata, provider, model, downloaded_at, locked_at, created_at
     FROM avatar_generations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows.map(normalizeGeneration);
}

export async function getAvatarGeneration({ userId, generationId }) {
  const result = await query(
    `SELECT id, parent_generation_id, image, image_file, thumb_file, prompt, negative_prompt, brief, avoid, selections, strategy, metadata, provider, model, downloaded_at, locked_at, created_at
     FROM avatar_generations
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [generationId, userId],
  );
  return result.rows[0] ? normalizeGeneration(result.rows[0]) : null;
}

async function getAvatarGenerationStorageRow({ userId, generationId }) {
  const result = await query(
    `SELECT image, image_file, thumb_file
     FROM avatar_generations
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [generationId, userId],
  );
  return result.rows[0] || null;
}

export async function getAvatarGenerationImageBytes({ userId, generationId }) {
  const row = await getAvatarGenerationStorageRow({ userId, generationId });
  if (!row) return null;
  const stored = row.image_file ? await readImage(row.image_file) : null;
  return stored || parseDataUrl(row.image);
}

export async function getAvatarGenerationThumbBytes({ userId, generationId }) {
  const row = await getAvatarGenerationStorageRow({ userId, generationId });
  if (!row) return null;
  const thumbnail = row.thumb_file ? await readImage(row.thumb_file) : null;
  if (thumbnail) return thumbnail;
  const original = row.image_file ? await readImage(row.image_file) : null;
  return original || parseDataUrl(row.image);
}

export async function migrateLegacyImages() {
  if (!pool) return 0;
  const result = await query(
    `SELECT id, image
     FROM avatar_generations
     WHERE image LIKE 'data:%' AND image_file IS NULL
     ORDER BY created_at ASC`,
  );
  let migrated = 0;
  for (const row of result.rows) {
    try {
      const { imageFile, thumbFile } = await saveImage(row.image);
      const updated = await query(
        `UPDATE avatar_generations
         SET image_file = $1, thumb_file = $2, image = ''
         WHERE id = $3 AND image_file IS NULL`,
        [imageFile, thumbFile, row.id],
      );
      migrated += updated.rowCount;
    } catch (error) {
      console.warn('[image-migration] Skipped generation', row.id, error?.message || error);
    }
  }
  console.log(`[image-migration] Migrated ${migrated} legacy image(s).`);
  return migrated;
}

export async function deleteAvatarGeneration({ userId, generationId }) {
  const result = await query(
    'DELETE FROM avatar_generations WHERE id = $1 AND user_id = $2 RETURNING id, image_file, thumb_file',
    [generationId, userId],
  );
  const row = result.rows[0];
  if (!row) return false;
  if (row.image_file) {
    // 防御:仅当没有其他记录引用同一文件时才删除磁盘文件。
    const shared = await query(
      'SELECT 1 FROM avatar_generations WHERE image_file = $1 LIMIT 1',
      [row.image_file],
    );
    if (!shared.rowCount) await deleteImageFiles(row.image_file, row.thumb_file).catch(() => {});
  }
  return true;
}

export async function reserveDownloadForGeneration({ userId, generationId }) {
  if (!pool) throw new Error('DATABASE_URL is not configured.');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await releaseExpiredReservations(client, userId);

    const generationResult = await client.query(
      `SELECT id, parent_generation_id, image, image_file, thumb_file, prompt, negative_prompt, brief, avoid, selections, strategy, metadata, provider, model, downloaded_at, locked_at, created_at
       FROM avatar_generations
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [generationId, userId],
    );
    const generation = generationResult.rows[0];
    if (!generation) {
      await client.query('COMMIT');
      return { generation: null, allowance: null, charged: false, paymentRequired: false };
    }

    const accountResult = await client.query(
      `SELECT free_generations_used, paid_generation_credits,
              plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );
    const account = accountResult.rows[0];
    if (!account) throw new Error('Billing account was not found.');

    if (generation.downloaded_at || generation.locked_at) {
      await client.query('COMMIT');
      return {
        generation: normalizeGeneration(generation),
        allowance: normalizeAllowance(account),
        charged: false,
        paymentRequired: false,
      };
    }

    const today = shanghaiToday();
    const planEntry = getPlan(account.plan_id);
    const activePlan = planEntry
      ? {
          ...planEntry,
          expiresAt: account.plan_expires_at,
          dailyDate: account.plan_daily_date,
          unlimited: planEntry.dailyQuota === null,
        }
      : null;
    const dailyUsed = planDailyUsedForDate(account.plan_daily_used, account.plan_daily_date, today);
    const source = pickDeductionSource({
      plan: activePlan,
      dailyUsed: account.plan_daily_used,
      freeUsed: account.free_generations_used,
      paidCredits: account.paid_generation_credits,
      today,
    });
    if (source === 'plan' && !activePlan.unlimited) {
      account.plan_daily_used = dailyUsed + 1;
      account.plan_daily_date = today;
    } else if (source === 'free') {
      account.free_generations_used = Number(account.free_generations_used) + 1;
    } else if (source === 'paid') {
      account.paid_generation_credits = Number(account.paid_generation_credits) - 1;
    }

    if (!source) {
      await client.query('COMMIT');
      return {
        generation: normalizeGeneration(generation),
        allowance: normalizeAllowance(account),
        charged: false,
        paymentRequired: true,
      };
    }

    await client.query(
      `UPDATE users
       SET free_generations_used = $2,
           paid_generation_credits = $3,
           plan_daily_used = $4,
           plan_daily_date = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [
        userId,
        account.free_generations_used,
        account.paid_generation_credits,
        account.plan_daily_used,
        account.plan_daily_date,
      ],
    );
    await client.query(
      `INSERT INTO generation_reservations (user_id, source, status, generation_id, consumed_at)
       VALUES ($1, $2, 'consumed', $3, NOW())`,
      [userId, source, generationId],
    );
    const lockedResult = await client.query(
      `UPDATE avatar_generations
       SET downloaded_at = NOW(), locked_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, parent_generation_id, image, image_file, thumb_file, prompt, negative_prompt, brief, avoid, selections, strategy, metadata, provider, model, downloaded_at, locked_at, created_at`,
      [generationId, userId],
    );

    await client.query('COMMIT');
    return {
      generation: normalizeGeneration(lockedResult.rows[0]),
      allowance: normalizeAllowance(account),
      charged: true,
      paymentRequired: false,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function normalizeAllowance(row, planCatalogEntry = getPlan(row?.plan_id), now = new Date()) {
  const freeUsed = Number(row?.free_generations_used || 0);
  const paidCredits = Number(row?.paid_generation_credits || 0);
  const freeRemaining = Math.max(0, FREE_GENERATION_LIMIT - freeUsed);
  const expiresAt = row?.plan_expires_at ? new Date(row.plan_expires_at) : null;
  const planActive = Boolean(
    planCatalogEntry
    && expiresAt
    && Number.isFinite(expiresAt.getTime())
    && expiresAt > now,
  );
  const today = shanghaiToday(now);
  const dailyUsed = planActive
    ? planDailyUsedForDate(row.plan_daily_used, row.plan_daily_date, today)
    : 0;
  const plan = planActive
    ? {
        id: planCatalogEntry.id,
        name: planCatalogEntry.name,
        expiresAt: expiresAt.toISOString(),
        dailyQuota: planCatalogEntry.dailyQuota,
        dailyUsed,
        dailyRemaining: planCatalogEntry.dailyQuota === null
          ? null
          : Math.max(0, planCatalogEntry.dailyQuota - dailyUsed),
        unlimited: planCatalogEntry.dailyQuota === null,
        cancelled: Boolean(row.plan_cancelled_at),
      }
    : null;
  return {
    freeLimit: FREE_GENERATION_LIMIT,
    freeUsed,
    freeRemaining,
    paidCredits,
    plan,
    canGenerate: freeRemaining > 0
      || paidCredits > 0
      || Boolean(plan && (plan.unlimited || plan.dailyRemaining > 0)),
  };
}

async function releaseExpiredReservations(client, userId) {
  const expired = await client.query(
    `UPDATE generation_reservations
     SET status = 'released', released_at = NOW()
     WHERE user_id = $1
       AND status = 'reserved'
       AND created_at < NOW() - INTERVAL '30 minutes'
     RETURNING source`,
    [userId],
  );

  if (!expired.rowCount) return;
  const freeCount = expired.rows.filter((row) => row.source === 'free').length;
  const paidCount = expired.rows.filter((row) => row.source === 'paid').length;
  const planCount = expired.rows.filter((row) => row.source === 'plan').length;
  await client.query(
    `UPDATE users
     SET free_generations_used = GREATEST(0, free_generations_used - $2),
         paid_generation_credits = paid_generation_credits + $3,
         plan_daily_used = GREATEST(0, plan_daily_used - $4),
         updated_at = NOW()
     WHERE id = $1`,
    [userId, freeCount, paidCount, planCount],
  );
}

export async function getGenerationAllowance(userId) {
  const result = await query(
    `SELECT free_generations_used, paid_generation_credits,
            plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] ? normalizeAllowance(result.rows[0]) : null;
}

export async function reserveGenerationEntitlement(userId) {
  if (!pool) throw new Error('DATABASE_URL is not configured.');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await releaseExpiredReservations(client, userId);
    const accountResult = await client.query(
      `SELECT free_generations_used, paid_generation_credits,
              plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );
    const account = accountResult.rows[0];
    if (!account) throw new Error('Billing account was not found.');

    const today = shanghaiToday();
    const planEntry = getPlan(account.plan_id);
    const activePlan = planEntry
      ? {
          ...planEntry,
          expiresAt: account.plan_expires_at,
          dailyDate: account.plan_daily_date,
          unlimited: planEntry.dailyQuota === null,
        }
      : null;
    const dailyUsed = planDailyUsedForDate(account.plan_daily_used, account.plan_daily_date, today);
    const source = pickDeductionSource({
      plan: activePlan,
      dailyUsed: account.plan_daily_used,
      freeUsed: account.free_generations_used,
      paidCredits: account.paid_generation_credits,
      today,
    });
    if (source === 'plan' && !activePlan.unlimited) {
      account.plan_daily_used = dailyUsed + 1;
      account.plan_daily_date = today;
    } else if (source === 'free') {
      account.free_generations_used = Number(account.free_generations_used) + 1;
    } else if (source === 'paid') {
      account.paid_generation_credits = Number(account.paid_generation_credits) - 1;
    }

    if (!source) {
      await client.query('COMMIT');
      return { reservation: null, allowance: normalizeAllowance(account) };
    }

    await client.query(
      `UPDATE users
       SET free_generations_used = $2,
           paid_generation_credits = $3,
           plan_daily_used = $4,
           plan_daily_date = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [
        userId,
        account.free_generations_used,
        account.paid_generation_credits,
        account.plan_daily_used,
        account.plan_daily_date,
      ],
    );
    const reservationResult = await client.query(
      `INSERT INTO generation_reservations (user_id, source)
       VALUES ($1, $2)
       RETURNING id, user_id, source, status, created_at`,
      [userId, source],
    );
    await client.query('COMMIT');
    return {
      reservation: reservationResult.rows[0],
      allowance: normalizeAllowance(account),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function completeGenerationReservation({ reservationId, userId, generationId }) {
  const result = await query(
    `UPDATE generation_reservations
     SET status = 'consumed', generation_id = $3, consumed_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'reserved'
     RETURNING id`,
    [reservationId, userId, generationId],
  );
  if (result.rowCount) return true;

  const existing = await query(
    'SELECT status FROM generation_reservations WHERE id = $1 AND user_id = $2 LIMIT 1',
    [reservationId, userId],
  );
  if (existing.rows[0]?.status === 'consumed') return true;
  throw new Error('Generation reservation could not be completed.');
}

export async function releaseGenerationReservation({ reservationId, userId }) {
  if (!pool || !reservationId) return false;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const reservationResult = await client.query(
      `SELECT id, source, status
       FROM generation_reservations
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [reservationId, userId],
    );
    const reservation = reservationResult.rows[0];
    if (!reservation || reservation.status !== 'reserved') {
      await client.query('COMMIT');
      return false;
    }

    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);

    await client.query(
      `UPDATE generation_reservations
       SET status = 'released', released_at = NOW()
       WHERE id = $1`,
      [reservationId],
    );
    const refundSql = reservation.source === 'free'
      ? `UPDATE users SET free_generations_used = GREATEST(0, free_generations_used - 1), updated_at = NOW() WHERE id = $1`
      : reservation.source === 'plan'
        ? `UPDATE users SET plan_daily_used = GREATEST(0, plan_daily_used - 1), updated_at = NOW() WHERE id = $1`
        : `UPDATE users SET paid_generation_credits = paid_generation_credits + 1, updated_at = NOW() WHERE id = $1`;
    await client.query(refundSql, [userId]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function applyPlanPurchase(client, { userId, planId, action = 'activate', durationDays }) {
  const returning = `RETURNING free_generations_used, paid_generation_credits,
               plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at`;
  if (action === 'renew') {
    const result = await client.query(
      `UPDATE users
       SET plan_id = $2,
           plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + ($3 || ' days')::interval,
           plan_cancelled_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       ${returning}`,
      [userId, planId, durationDays],
    );
    return result.rows[0] || null;
  }
  if (action === 'upgrade') {
    const result = await client.query(
      `UPDATE users
       SET plan_id = $2,
           plan_expires_at = CASE
             WHEN plan_expires_at IS NOT NULL AND plan_expires_at > NOW() THEN plan_expires_at
             ELSE NOW() + ($3 || ' days')::interval
           END,
           plan_cancelled_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       ${returning}`,
      [userId, planId, durationDays],
    );
    return result.rows[0] || null;
  }
  const result = await client.query(
    `UPDATE users
     SET plan_id = $2,
         plan_expires_at = NOW() + ($3 || ' days')::interval,
         plan_daily_used = 0,
         plan_daily_date = NULL,
         plan_cancelled_at = NULL,
         updated_at = NOW()
     WHERE id = $1
     ${returning}`,
    [userId, planId, durationDays],
  );
  return result.rows[0] || null;
}

export async function cancelUserPlan(userId) {
  // 取消 = 停止续期：套餐保留到当前到期日，期间额度照常，之后自然失效。
  const result = await query(
    `UPDATE users
     SET plan_cancelled_at = CASE
           WHEN plan_id IS NOT NULL AND plan_expires_at > NOW() THEN COALESCE(plan_cancelled_at, NOW())
           ELSE plan_cancelled_at
         END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING free_generations_used, paid_generation_credits,
               plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at`,
    [userId],
  );
  return result.rows[0] ? normalizeAllowance(result.rows[0]) : null;
}

export async function createPaymentOrder({ userId, provider, amountMinor, currency, credits, planId = null, planAction = null }) {
  const result = await query(
    `INSERT INTO payment_orders (user_id, provider, amount_minor, currency, credits, plan_id, plan_action)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, provider, amount_minor, currency, credits, plan_id, plan_action, status, created_at`,
    [userId, provider, amountMinor, currency, credits, planId, planAction],
  );
  return result.rows[0];
}

export async function attachPaymentSession({ orderId, userId, providerSessionId }) {
  const result = await query(
    `UPDATE payment_orders
     SET provider_session_id = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id`,
    [orderId, userId, providerSessionId],
  );
  return Boolean(result.rowCount);
}

export async function getPaymentOrder({ orderId, userId }) {
  const result = await query(
    `SELECT id, user_id, provider, provider_session_id, provider_payment_id,
            amount_minor, currency, credits, plan_id, status, fulfilled_at, created_at
     FROM payment_orders
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [orderId, userId],
  );
  return result.rows[0] || null;
}

export async function createTestPaymentCredit({ userId, amountMinor, currency, credits, planId = null, planAction = null }) {
  if (!pool) throw new Error('DATABASE_URL is not configured.');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const accountResult = await client.query(
      `SELECT id
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );
    if (!accountResult.rowCount) throw new Error('Billing account was not found.');
    const plan = planId ? getPlan(planId) : null;
    if (planId && !plan) throw new Error('Payment plan was not found.');

    const orderResult = await client.query(
      `INSERT INTO payment_orders
         (user_id, provider, provider_session_id, provider_payment_id, amount_minor, currency, credits, plan_id, plan_action, status, fulfilled_at)
       VALUES
         ($1, 'test', 'test_' || gen_random_uuid()::text, 'local_simulation', $2, $3, $4, $5, $6, 'paid', NOW())
       RETURNING id`,
      [userId, amountMinor, currency, credits, planId, planAction],
    );
    const allowance = plan
      ? await applyPlanPurchase(client, { userId, planId, action: planAction || 'activate', durationDays: plan.durationDays })
      : (await client.query(
          `UPDATE users
           SET paid_generation_credits = paid_generation_credits + $2, updated_at = NOW()
           WHERE id = $1
           RETURNING free_generations_used, paid_generation_credits,
                     plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at`,
          [userId, credits],
        )).rows[0];
    await client.query('COMMIT');
    return {
      orderId: orderResult.rows[0].id,
      allowance: normalizeAllowance(allowance),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function fulfillPaymentOrder({ provider, providerSessionId, providerPaymentId, amountMinor, currency, orderId, userId }) {
  if (!pool) throw new Error('DATABASE_URL is not configured.');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT * FROM payment_orders
       WHERE provider_session_id = $1
          OR (provider_session_id IS NULL AND id = $2 AND user_id = $3)
       FOR UPDATE`,
      [providerSessionId, orderId || null, userId || null],
    );
    const order = orderResult.rows[0];
    if (!order) throw new Error('Payment order was not found.');
    if (provider && order.provider !== provider) {
      throw new Error('Payment provider does not match the order.');
    }
    if (order.provider_session_id && order.provider_session_id !== providerSessionId) {
      throw new Error('Payment Session does not match the order.');
    }
    if (Number(order.amount_minor) !== Number(amountMinor) || order.currency !== String(currency).toLowerCase()) {
      throw new Error('Payment amount or currency does not match the order.');
    }

    if (order.status !== 'paid') {
      const accountLock = await client.query(
        'SELECT id FROM users WHERE id = $1 FOR UPDATE',
        [order.user_id],
      );
      if (!accountLock.rowCount) throw new Error('Billing account was not found.');
      await client.query(
        `UPDATE payment_orders
         SET status = 'paid', provider_session_id = $3, provider_payment_id = $2, fulfilled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [order.id, providerPaymentId || null, providerSessionId],
      );
      if (order.plan_id) {
        const plan = getPlan(order.plan_id);
        if (!plan) throw new Error('Payment plan was not found.');
        await applyPlanPurchase(client, {
          userId: order.user_id,
          planId: order.plan_id,
          action: order.plan_action || 'activate',
          durationDays: plan.durationDays,
        });
      } else {
        await client.query(
          `UPDATE users
           SET paid_generation_credits = paid_generation_credits + $2, updated_at = NOW()
           WHERE id = $1`,
          [order.user_id, order.credits],
        );
      }
    }

    const accountResult = await client.query(
      `SELECT free_generations_used, paid_generation_credits,
              plan_id, plan_expires_at, plan_daily_used, plan_daily_date, plan_cancelled_at
       FROM users
       WHERE id = $1`,
      [order.user_id],
    );
    await client.query('COMMIT');
    return {
      orderId: order.id,
      userId: order.user_id,
      allowance: normalizeAllowance(accountResult.rows[0]),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function normalizeGeneration(row) {
  return {
    id: row.id,
    parentGenerationId: row.parent_generation_id,
    image: row.image_file ? `/api/generations/${row.id}/image` : row.image,
    thumb: row.thumb_file
      ? `/api/generations/${row.id}/thumb`
      : row.image_file
        ? `/api/generations/${row.id}/image`
        : row.image,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt,
    brief: row.brief,
    avoid: row.avoid,
    selections: row.selections,
    strategy: row.strategy,
    metadata: row.metadata,
    provider: row.provider,
    model: row.model,
    downloadedAt: row.downloaded_at,
    lockedAt: row.locked_at,
    locked: Boolean(row.locked_at || row.downloaded_at),
    createdAt: row.created_at,
    downloadUrl: `/api/generations/${row.id}/download`,
  };
}
