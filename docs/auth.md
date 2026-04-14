# Authentication

## The team token

When you run `npx @agntxapp/agntx init`, agntx creates a **team token** — a random 256-bit secret that identifies your project.

```
agntx_001de47894e1811aa3a9afbe772065e917802897ac91c9fb50f8ab4184ac192d
```

This token is written into `.mcp.json`:

```json
{
  "mcpServers": {
    "agntx": {
      "command": "npx",
      "args": ["-y", "@agntxapp/agntx"],
      "env": {
        "AGNTX_TEAM_TOKEN": "agntx_...",
        "AGNTX_PROJECT_SLUG": "my-project"
      }
    }
  }
}
```

Every API call the MCP server makes includes this token as a Bearer header. The server validates it, looks up the team, and scopes all reads and writes to that team's data only.

---

## What the token is — and isn't

| | Team token |
|---|---|
| Format | `agntx_` + 64 hex characters |
| Entropy | 256 bits |
| Expiry | None (persistent until revoked) |
| Scope | All data for one team |
| Type | Opaque secret — **not** a JWT |

The token is not a Supabase JWT and has no embedded claims. It is validated on every request by looking it up in the database.

---

## Sharing the token

The token is **shared across your whole team** — all developers on the same project use the same token. This is by design: the shared context is team-owned, not per-developer.

`.mcp.json` is committed to git so teammates get the MCP server automatically when they clone the repo.

**Keep the token secret:**

```bash
# Add to .gitignore if you prefer not to commit the token to a public repo
.mcp.json

# Or use git-crypt to encrypt it at rest
git-crypt add-gpg-user <your-key>
```

If you commit `.mcp.json` to a public repo, anyone with the token can read and write your project context. For private repos, committing it is fine and is the recommended approach.

---

## How the MCP server loads it

The MCP server reads the token from environment variables, which Claude Code injects automatically from `.mcp.json`:

```
AGNTX_TEAM_TOKEN    → the team token
AGNTX_PROJECT_SLUG  → which project to read/write
AGNTX_API_URL       → API endpoint (default: https://api.agntx.app)
```

You never handle these manually — `npx @agntxapp/agntx init` writes them and Claude Code loads them.
