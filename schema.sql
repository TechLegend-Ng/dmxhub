-- DramaXHub D1 Schema - Tasks 3,4,5,6
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  provider TEXT DEFAULT 'email',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS watch_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  seconds REAL NOT NULL DEFAULT 0,
  duration REAL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  last_watched_at INTEGER NOT NULL,
  progress_seconds REAL DEFAULT 0,
  completed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  movie_id INTEGER NOT NULL,
  rating INTEGER CHECK (rating >=1 AND rating <=5),
  comment TEXT,
  guest_name TEXT,
  created_at INTEGER NOT NULL,
  verified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at INTEGER NOT NULL
);
