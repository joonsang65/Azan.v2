-- PostgreSQL bootstrap schema for International Student Notice Service
-- Includes: users, keywords, notices, alerting, LLM message storage, optional push tokens
-- Run with: psql -d <database_name> -f postgresql_init.sql

BEGIN;

-- =========================================================
-- 1) Extensions
-- =========================================================
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- 2) Enums
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_code') THEN
    CREATE TYPE language_code AS ENUM ('en', 'ko', 'zh', 'ja', 'vi');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_provider') THEN
    CREATE TYPE auth_provider AS ENUM ('local', 'google', 'apple', 'kakao', 'naver', 'microsoft');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notice_source_type') THEN
    CREATE TYPE notice_source_type AS ENUM ('university_portal', 'department_site', 'email_feed', 'manual');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_channel') THEN
    CREATE TYPE alert_channel AS ENUM ('push', 'email', 'sms', 'in_app');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
    CREATE TYPE alert_status AS ENUM ('pending', 'sent', 'failed', 'skipped');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_style') THEN
    CREATE TYPE message_style AS ENUM ('default', 'concise', 'friendly', 'formal');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_platform') THEN
    CREATE TYPE device_platform AS ENUM ('ios', 'android', 'web');
  END IF;
END$$;

-- =========================================================
-- 3) Core Tables
-- =========================================================

-- Users: identity, localization, auth
CREATE TABLE IF NOT EXISTS users (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email               CITEXT NOT NULL,
  display_name        TEXT NOT NULL,
  language            language_code NOT NULL DEFAULT 'en',
  timezone            TEXT NOT NULL DEFAULT 'UTC',
  provider            auth_provider NOT NULL DEFAULT 'local',
  provider_user_id    TEXT,
  password_hash       TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keywords: stable slug + localized display labels
CREATE TABLE IF NOT EXISTS keywords (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_slug            TEXT NOT NULL,
  display_names       JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User interests (M:N)
CREATE TABLE IF NOT EXISTS user_keyword_interests (
  user_id             BIGINT NOT NULL,
  keyword_id          INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notices from crawlers/external sources
CREATE TABLE IF NOT EXISTS notices (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_type         notice_source_type NOT NULL,
  source_name         TEXT NOT NULL,
  source_url          TEXT,
  source_notice_id    TEXT,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  published_at        TIMESTAMPTZ,
  deadline_at         TIMESTAMPTZ,
  dedupe_hash         TEXT NOT NULL,
  is_processed        BOOLEAN NOT NULL DEFAULT FALSE,
  is_embedded         BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notice tags (M:N)
CREATE TABLE IF NOT EXISTS notice_keywords (
  notice_id           BIGINT NOT NULL,
  keyword_id          INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert offsets for deadline reminders (D-7, D-5, ..., D0)
CREATE TABLE IF NOT EXISTS alert_offsets (
  id                  SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offset_days         SMALLINT NOT NULL,
  label               TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery ledger and dedupe guard
CREATE TABLE IF NOT EXISTS sent_alerts (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             BIGINT NOT NULL,
  notice_id           BIGINT NOT NULL,
  alert_offset_id     SMALLINT NOT NULL,
  channel             alert_channel NOT NULL,
  status              alert_status NOT NULL DEFAULT 'pending',
  scheduled_for       TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Localized LLM output for notices (per language/style)
CREATE TABLE IF NOT EXISTS notice_messages (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notice_id           BIGINT NOT NULL,
  language            language_code NOT NULL,
  style               message_style NOT NULL DEFAULT 'default',
  title               TEXT,
  body                TEXT NOT NULL,
  model_name          TEXT,
  model_version       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional device push tokens
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             BIGINT NOT NULL,
  platform            device_platform NOT NULL,
  push_token          TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 4) Constraints (FKs + uniques + checks)
-- =========================================================

ALTER TABLE users
  ADD CONSTRAINT uq_users_email UNIQUE (email),
  ADD CONSTRAINT uq_users_provider_identity UNIQUE (provider, provider_user_id);

ALTER TABLE keywords
  ADD CONSTRAINT uq_keywords_key_slug UNIQUE (key_slug);

ALTER TABLE user_keyword_interests
  ADD CONSTRAINT pk_user_keyword_interests PRIMARY KEY (user_id, keyword_id),
  ADD CONSTRAINT fk_user_keyword_interests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_keyword_interests_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE;

ALTER TABLE notices
  ADD CONSTRAINT uq_notices_dedupe_hash UNIQUE (dedupe_hash);

ALTER TABLE notice_keywords
  ADD CONSTRAINT pk_notice_keywords PRIMARY KEY (notice_id, keyword_id),
  ADD CONSTRAINT fk_notice_keywords_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_notice_keywords_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE;

ALTER TABLE alert_offsets
  ADD CONSTRAINT uq_alert_offsets_offset_days UNIQUE (offset_days),
  ADD CONSTRAINT uq_alert_offsets_label UNIQUE (label),
  ADD CONSTRAINT chk_alert_offsets_non_negative CHECK (offset_days >= 0);

ALTER TABLE sent_alerts
  ADD CONSTRAINT fk_sent_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_sent_alerts_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_sent_alerts_offset FOREIGN KEY (alert_offset_id) REFERENCES alert_offsets(id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_sent_alerts_dedupe UNIQUE (user_id, notice_id, alert_offset_id, channel);

ALTER TABLE notice_messages
  ADD CONSTRAINT fk_notice_messages_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
  ADD CONSTRAINT uq_notice_messages_variant UNIQUE (notice_id, language, style);

ALTER TABLE device_push_tokens
  ADD CONSTRAINT fk_device_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT uq_device_push_tokens_token UNIQUE (push_token);

-- =========================================================
-- 5) Indexes (query optimization)
-- =========================================================

-- Find users by interest keyword quickly
CREATE INDEX IF NOT EXISTS idx_user_keyword_interests_keyword_user
  ON user_keyword_interests (keyword_id, user_id);

-- Find notices by keyword quickly
CREATE INDEX IF NOT EXISTS idx_notice_keywords_keyword_notice
  ON notice_keywords (keyword_id, notice_id);

-- Upcoming deadlines and scheduler scans
CREATE INDEX IF NOT EXISTS idx_notices_upcoming_deadline
  ON notices (deadline_at)
  WHERE deadline_at IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_notices_published_at
  ON notices (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_notices_source_lookup
  ON notices (source_type, source_name, source_notice_id);

CREATE INDEX IF NOT EXISTS idx_sent_alerts_pending_schedule
  ON sent_alerts (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sent_alerts_user_created
  ON sent_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notice_messages_notice_lang_style
  ON notice_messages (notice_id, language, style);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_active
  ON device_push_tokens (user_id, is_active);

-- =========================================================
-- 6) Seed data for alert offsets
-- =========================================================

INSERT INTO alert_offsets (offset_days, label)
VALUES
  (7, 'D-7'),
  (5, 'D-5'),
  (3, 'D-3'),
  (2, 'D-2'),
  (1, 'D-1'),
  (0, 'D0')
ON CONFLICT (offset_days) DO UPDATE
SET label = EXCLUDED.label,
    is_active = TRUE;

-- =========================================================
-- 7) Table/column comments (design intent)
-- =========================================================

COMMENT ON TABLE users IS 'Application users with identity, locale preferences, and authentication metadata.';
COMMENT ON COLUMN users.email IS 'Case-insensitive unique email using CITEXT.';
COMMENT ON COLUMN users.timezone IS 'IANA timezone string, e.g. Asia/Seoul or America/New_York.';

COMMENT ON TABLE keywords IS 'Canonical keyword taxonomy for notice matching and user interests.';
COMMENT ON COLUMN keywords.key_slug IS 'Stable unique slug used in backend logic and APIs.';
COMMENT ON COLUMN keywords.display_names IS 'Localized labels map, e.g. {"en":"Scholarship","ko":"장학금"}.';

COMMENT ON TABLE user_keyword_interests IS 'Many-to-many mapping between users and their selected keywords.';

COMMENT ON TABLE notices IS 'Ingested notices from multiple sources. dedupe_hash prevents duplicated inserts.';
COMMENT ON COLUMN notices.is_processed IS 'True when parsing/enrichment pipeline is completed.';
COMMENT ON COLUMN notices.is_embedded IS 'True when embeddings are generated for RAG retrieval.';

COMMENT ON TABLE notice_keywords IS 'Many-to-many mapping between notices and matched keywords.';

COMMENT ON TABLE alert_offsets IS 'Configurable reminder points relative to notice deadline.';
COMMENT ON COLUMN alert_offsets.offset_days IS 'Non-negative day offset. 0 means D-day.';

COMMENT ON TABLE sent_alerts IS 'Notification send log and dedupe ledger for alert pipeline.';
COMMENT ON COLUMN sent_alerts.status IS 'Delivery state: pending, sent, failed, or skipped.';

COMMENT ON TABLE notice_messages IS 'Localized LLM-generated notice messages by language and style.';

COMMENT ON TABLE device_push_tokens IS 'Optional per-device push tokens for mobile/web clients.';

COMMIT;
