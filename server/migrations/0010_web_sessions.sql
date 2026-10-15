-- Signing in on vibetime.club. The cookie holds a random token and only its
-- hash is stored, so a leaked table cannot be replayed as a session.
CREATE TABLE web_sessions (
  token_hash     TEXT PRIMARY KEY,
  user_github_id INTEGER NOT NULL REFERENCES users(github_id),
  created_at     TEXT NOT NULL,
  expires_at     TEXT NOT NULL
);
CREATE INDEX idx_web_sessions_expires ON web_sessions(expires_at);
