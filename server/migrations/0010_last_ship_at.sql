-- When this session last earned a ship. Lets a submit without commit facts
-- see that another session on the same branch was just paid for what both of
-- them are counting. Null for every existing row, which reads as never.
ALTER TABLE sessions ADD COLUMN last_ship_at TEXT;
CREATE INDEX idx_sessions_branch_ship ON sessions(user_github_id, project_hash, branch_hash, last_ship_at);
