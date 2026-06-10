-- Composite indexes for the two hot Message query shapes:
--  * inbox/unread fetches filter receiverId and order by createdAt DESC
--  * conversation view filters (senderId, receiverId) pairs in both directions
-- The existing single-column indexes can't serve the filter+sort together,
-- so these queries degrade to sorts over every row a user has ever
-- sent/received.

CREATE INDEX IF NOT EXISTS "Message_receiverId_createdAt_idx" ON "Message"("receiverId", "createdAt");

CREATE INDEX IF NOT EXISTS "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");
