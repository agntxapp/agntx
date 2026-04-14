-- Copyright 2026 NTC DEV
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

-- agntx — example schema
-- This is a simplified reference showing the data model.
-- The hosted service at api.agntx.app runs a production version
-- with RLS, billing enforcement, rate limiting, and conflict resolution.
--
-- Use this as a starting point if you want to self-host.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE teams (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  slug  text UNIQUE NOT NULL,
  plan  text DEFAULT 'free'
);

CREATE TABLE team_tokens (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  token   text UNIQUE NOT NULL
);

CREATE TABLE projects (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  slug    text NOT NULL,
  name    text NOT NULL,
  UNIQUE(team_id, slug)
);

-- The living document. One row per project.
-- version is an optimistic lock — increment on every save.
CREATE TABLE project_contexts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  version       int  NOT NULL DEFAULT 1,
  stack         jsonb DEFAULT '{}',
  architecture  jsonb DEFAULT '{}',
  rules         jsonb DEFAULT '{}',
  current_state jsonb DEFAULT '{}',
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

-- Append-only. Never update or delete rows.
-- The WHY behind every decision is the core value.
CREATE TABLE decisions_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid REFERENCES projects(id) ON DELETE CASCADE,
  decision              text NOT NULL,
  reason                text NOT NULL,
  rejected_alternatives text[] DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);

CREATE TABLE sessions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               uuid REFERENCES projects(id) ON DELETE CASCADE,
  summary                  text,
  files_touched            text[] DEFAULT '{}',
  context_version_at_start int,
  created_at               timestamptz DEFAULT now()
);

-- Created when two saves conflict on the same version.
CREATE TABLE conflicts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  version_a        int NOT NULL,
  version_b        int NOT NULL,
  data_a           jsonb NOT NULL,
  data_b           jsonb NOT NULL,
  resolved_at      timestamptz,
  resolution_notes text
);

-- Only used for projects exceeding 2000 tokens of context.
-- Default: Supabase AI gte-small → vector(384)
CREATE TABLE context_chunks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  content    text NOT NULL,
  embedding  vector(384),
  chunk_type text CHECK (chunk_type IN ('stack', 'architecture', 'rules', 'decisions', 'state'))
);
