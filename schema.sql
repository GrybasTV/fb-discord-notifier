-- Migration script for Turso (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitored_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT,
  last_post_id TEXT,
  last_checked DATETIME,
  status TEXT DEFAULT 'active',
  discord_webhook_url TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pages_user ON monitored_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON monitored_pages(status);

CREATE TABLE IF NOT EXISTS test_scrape_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  posts TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_test_requests_user ON test_scrape_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_test_requests_status ON test_scrape_requests(status);
