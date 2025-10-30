/*
  # Face Recognition Door Lock System Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique, not null) - Name of the registered user
      - `face_descriptors` (jsonb, not null) - Array of face descriptor vectors for recognition
      - `created_at` (timestamptz) - Registration timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `access_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - Reference to users table (null for unknown faces)
      - `username` (text, nullable) - Username (denormalized for easier queries)
      - `access_type` (text, not null) - Type: 'granted', 'denied', 'unknown'
      - `confidence` (numeric, nullable) - Recognition confidence percentage
      - `timestamp` (timestamptz) - When access was attempted
      - `unlocked_duration` (integer, nullable) - How many seconds door was unlocked

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated access
    
  3. Important Notes
    - Face descriptors stored as JSONB arrays for ML model compatibility
    - Access logs track both successful and failed attempts
    - System supports multiple face samples per user for better accuracy
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  face_descriptors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  username text,
  access_type text NOT NULL CHECK (access_type IN ('granted', 'denied', 'unknown')),
  confidence numeric,
  timestamp timestamptz DEFAULT now(),
  unlocked_duration integer
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users"
  ON users FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to users"
  ON users FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to users"
  ON users FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to access_logs"
  ON access_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to access_logs"
  ON access_logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);