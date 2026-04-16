-- Insert default user
INSERT INTO "User" (id, email, name, role, "createdAt", "updatedAt")
VALUES ('user-1', 'admin@example.com', 'Admin User', 'tester', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
