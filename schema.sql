-- DMXHUB D1 Schema
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS watch_progress;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  google_id TEXT,
  avatar_url TEXT,
  provider TEXT,
  created_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE watch_progress (
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  seconds INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  updated_at INTEGER,
  PRIMARY KEY(user_id, movie_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  movie_id TEXT NOT NULL,
  rating INTEGER,
  comment TEXT,
  guest_name TEXT,
  created_at INTEGER,
  verified INTEGER DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_reviews_movie_id ON reviews(movie_id);
