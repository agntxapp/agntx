# agntx

Shared living project context for teams building with Claude.

Context lives on a server, not on each developer's machine. Your team's decisions, architecture, and current state are injected into every Claude session automatically.

```bash
npx @agntxapp/agntx init
```

→ [agntx.app](https://agntx.app) · [GitHub](https://github.com/agntxapp/agntx)

---

## The Problem

Every Claude session starts from scratch. In teams this compounds — each developer re-explains the same project, makes decisions nobody else knows about, wastes tokens on warmup every morning.

**agntx fixes this.** Context lives on a server. Run `/status` at the start of any session to pull your team's current state. Run `/save` at the end to push what you learned.

---

## How It Works

**1. Install**
```bash
npx @agntxapp/agntx init
```
Detects your stack, pre-fills `CLAUDE.md` with community-maintained gotchas for your stack, and wires up the MCP server. Committed to git — every teammate gets it automatically via `.mcp.json`.

**2. Pull**
```bash
/status
```
The MCP server fetches your team's context from the server and injects it into the Claude session. Claude confirms understanding before touching anything.

**3. Push**
```bash
/save
```
Claude structures what happened — decisions made, files touched, what's next — and pushes to the team. You don't write anything.

---

## The 4 Commands

| Command | When | What |
|---------|------|------|
| `/status` | Start of every session | Pulls context, confirms understanding |
| `/save` | End of session | Claude extracts decisions and pushes to the team |
| `/resolve <id> A\|B\|both` | After a conflict | Two devs saved at the same time — pick which wins |
| `/diff` | Before starting work | Shows what changed since your last pull |

---

## Stack Templates

`agntx init` detects your stack from `package.json` and pre-fills your `CLAUDE.md` with the things that actually bite people in production:

- **Expo + Supabase** — RLS gotchas, EAS build checklist, auth edge cases
- **Next.js + Supabase** — App Router + server client setup, `getUser()` vs `getSession()`, async cookies
- **Next.js + Prisma** — PrismaClient singleton for hot reload, serverless connection exhaustion, `$transaction()` forms

No template for your stack? The wizard interviews you and generates the same output.

---

## Decisions Log

Every `/save` captures not just *what* changed but *why* — and what was rejected. Append-only. Nothing is ever overwritten.

```json
{
  "decision": "Use Supabase AI for embeddings",
  "reason": "Zero external dependencies, built into Edge Functions",
  "rejected_alternatives": ["OpenAI ada-002 — adds OpenAI dependency"]
}
```

Six months later, when someone asks "why don't we use X here?" — the answer is in the log.

---

## Requirements

- Node.js ≥ 18
- [Claude Code](https://claude.ai/code)

---

## License

Apache 2.0 — [agntx.app](https://agntx.app)
