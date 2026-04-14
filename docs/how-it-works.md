# How agntx Works

agntx keeps a shared project context on a server. Every Claude session pulls that context before starting work and pushes updates when done. This means the next developer — or the same developer next week — starts with full context instead of rebuilding it from scratch.

---

## The flow

```
Developer A
  npx @agntxapp/agntx init     → registers project, generates .mcp.json
  Claude Code opens             → MCP server starts automatically
  /status                       → pulls shared context into session
  ... works on feature ...
  /save                         → Claude extracts decisions, pushes to server

Developer B (same repo, cloned)
  Claude Code opens             → reads .mcp.json, MCP server starts
  /status                       → sees Developer A's decisions and current state
  ... continues without re-explaining anything ...
```

---

## What lives where

**On your machine**
- `.mcp.json` — tells Claude Code how to start the MCP server and which project to connect to
- `CLAUDE.md` — stack rules, architecture notes, conventions (edited by your team)
- `.claude/commands/` — the slash commands (`/save`, `/status`, `/resolve`)

**On the server**
- The living context: current state, decisions log, open conflicts
- Version history of every save

`.mcp.json` is committed to git. Every teammate who clones the repo gets the MCP server automatically — no per-developer setup.

---

## What gets saved

When you run `/save`, Claude extracts from the conversation:

| Field | What it captures |
|---|---|
| `done` | Items completed this session |
| `in_progress` | Work started but not finished |
| `next_priority` | The single most important next step |
| `decisions` | Non-obvious choices — what was decided, why, what was rejected |
| `files_touched` | Every file created or modified |
| `session_summary` | 2–3 sentences for the next developer to read |

Only non-obvious decisions are logged. The reasoning behind architectural choices, library selections, and trade-offs — things that would surprise a future developer — not "used a for loop."

---

## The decisions log

Every `/save` appends to a permanent, append-only decisions log. Nothing is ever overwritten or deleted.

```json
{
  "decision": "Use Supabase AI for embeddings",
  "reason": "Zero external dependencies, built into Edge Functions",
  "rejected_alternatives": ["OpenAI ada-002 — adds OpenAI dependency"]
}
```

Six months later, when someone asks "why don't we use OpenAI here?" — the answer is already in the log.

---

## Versioning

Every save increments a version number. The version is used to detect conflicts when two developers save at the same time. See [Conflicts](./conflicts.md).
