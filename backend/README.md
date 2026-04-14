# Self-Hosting agntx

The hosted service at **api.agntx.app** is the easiest way to get started — no infrastructure to manage.

If you need to run agntx on your own infrastructure (air-gapped environments, enterprise data residency requirements, etc.), the example files in this directory show you what to build.

---

## What you need

- A [Supabase](https://supabase.com) project with the `vector` extension enabled
- The schema from `schema.example.sql`
- Two Edge Functions based on `context-pull.example.ts` and `context-save.example.ts`

## What the examples don't include

The hosted service includes production features not shown in these examples:

- **Atomic conflict detection** — version checks run inside a Postgres transaction to prevent silent overwrites
- **Billing enforcement** — free tier limits (projects, members, saves/month)
- **Rate limiting** — per-team request limits on Edge Functions
- **pgvector similarity search** — token budget management for large projects
- **Supabase Realtime notifications** — team members notified on save

---

## Setup

```bash
# 1. Apply the schema
psql <your-connection-string> < schema.example.sql

# 2. Deploy functions
supabase functions deploy context-pull --no-verify-jwt
supabase functions deploy context-save --no-verify-jwt

# 3. Seed a team + token
INSERT INTO teams (name, slug) VALUES ('My Team', 'my-team');
INSERT INTO team_tokens (team_id, token) VALUES ('<team-id>', 'agntx_yourtoken');
INSERT INTO projects (team_id, slug, name) VALUES ('<team-id>', 'my-project', 'My Project');

# 4. Configure the MCP server to point to your instance
AGNTX_API_URL=https://your-project.supabase.co npx agntx init
```

---

## Contributing

If you improve the example implementations or add support for a new database backend, PRs are welcome.
