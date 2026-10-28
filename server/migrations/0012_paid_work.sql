-- Which pieces of work a ship has already paid for. A session's totals drop
-- and come back when its commits leave and re-enter its range, and only this
-- tells a commit coming back from a new one.
ALTER TABLE work_credits ADD COLUMN paid_at TEXT;
CREATE INDEX idx_work_credits_session ON work_credits(session_id);

-- Work held by a session whose event baseline has caught up with its totals
-- has been paid for. A session with work still pending keeps it unpaid, so its
-- next ship lands.
UPDATE work_credits SET paid_at = credited_at
 WHERE session_id IN (SELECT id FROM sessions WHERE event_baseline_commits >= commits);
