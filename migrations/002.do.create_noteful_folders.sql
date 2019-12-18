CREATE TABLE noteful_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL
);

ALTER TABLE
  noteful_notes
ADD
  COLUMN folder_id UUID REFERENCES noteful_folders(id) ON DELETE
SET
  NULL;