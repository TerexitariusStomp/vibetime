-- A crew is a name, an invite code and the people who chose to join it.
-- Memberships are never deleted: leaving sets left_at, so a week that has
-- already been shown keeps the members who earned it.
CREATE TABLE crews (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  owner_github_id INTEGER NOT NULL REFERENCES users(github_id),
  invite_code     TEXT NOT NULL UNIQUE,
  open            INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE UNIQUE INDEX idx_crews_live_slug ON crews(slug) WHERE deleted_at IS NULL;

CREATE TABLE crew_members (
  crew_id        INTEGER NOT NULL REFERENCES crews(id),
  user_github_id INTEGER NOT NULL REFERENCES users(github_id),
  joined_at      TEXT NOT NULL,
  left_at        TEXT,
  PRIMARY KEY (crew_id, user_github_id, joined_at)
);
CREATE INDEX idx_crew_members_user ON crew_members(user_github_id, left_at);
CREATE INDEX idx_crew_members_crew ON crew_members(crew_id, left_at);
