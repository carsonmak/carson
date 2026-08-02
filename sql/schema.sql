CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'message',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'guest',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diary_comments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'guest',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES diary_entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'guest',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON diary_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_diary_comments_entry_id ON diary_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
