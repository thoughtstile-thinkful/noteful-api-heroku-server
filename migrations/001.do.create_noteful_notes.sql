CREATE extension IF NOT EXISTS "uuid-ossp";

CREATE TABLE noteful_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  modified TIMESTAMP NOT NULL DEFAULT NOW(),
  content TEXT
);