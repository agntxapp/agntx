# agntx

> Shared living project context for teams building with Claude.

Every developer using Claude starts each session from scratch. In teams this compounds — each person re-explains the same project, makes decisions the rest of the team doesn't know about, and wastes tokens on warmup every single time.

**agntx fixes this.** Context lives on a server, not on your machine. Your team's decisions, architecture, and current state are injected into every Claude session automatically.

---

## How it works

```
Developer A pulls context → does work → saves context
Developer B pulls context → sees Developer A's decisions → continues without re-explaining anything
```

agntx is a [Model Context Protocol](https://modelcontextprotocol.io) server that installs in seconds and ships via git — every teammate gets it automatically when they clone the repo.

---

## Quick start

```bash
# Install in your project
npx @agntxapp/agntx init
```

That's it. agntx detects your stack, pre-fills your `CLAUDE.md` with known gotchas and rules for your technology, generates slash commands, and wires up the MCP server.

Open Claude Code and type `/status` to pull your team's context into the session.

---

## The 4 tools

| Tool | When to use |
|---|---|
| `/status` | Start of every session — pulls context and confirms understanding |
| `/save` | End of session — Claude extracts decisions and pushes to the team |
| `/diff` | Before starting work — shows what changed since your last pull |
| `/pull` | Mid-session — re-sync context with a task description for large projects |

---

## Stack templates

When you run `npx agntx init`, agntx detects your stack from `package.json` and pre-fills your context with community-maintained knowledge:

```
$ npx @agntxapp/agntx init

✓ Detected: Expo + Supabase
✓ Generated CLAUDE.md  (47 lines pre-filled)
✓ Generated .claude/commands/save.md
✓ Generated .claude/commands/status.md
✓ Generated .claude/commands/eas-build.md
✓ Generated .claude/commands/rls-check.md
✓ Generated .mcp.json
✓ Configured Stop hook

Team token: agntx_xxxx
```

No template for your stack? The wizard interviews you instead — same output, no community knowledge pre-filled. You can contribute your answers back as a template.

**Available templates**
- `expo+supabase`
- More coming — [contribute yours](#contributing-templates)

---

## Why the decisions log matters

Every `/save` captures not just *what* changed, but *why* — and what was rejected.

```json
{
  "decision": "Use Supabase AI for embeddings",
  "reason": "Zero external dependencies, built into Edge Functions",
  "rejected_alternatives": ["OpenAI ada-002 — adds OpenAI dependency"]
}
```

This is append-only. Nothing is ever overwritten. Six months later, when someone asks "why don't we use OpenAI here?" — the answer is already in the log.

---

## Conflict detection

Two developers save at the same time? agntx surfaces the conflict instead of silently overwriting:

```
⚠️ Conflict in current_state.next_priority:
  [Yours]   "Implement auth flow"
  [Theirs]  "Fix the onboarding bug first"

Run: /resolve A | /resolve B | /resolve both
```

Resolution is logged to the decisions history automatically.

---

## How teams adopt it

`.mcp.json` is committed to git. Every teammate who clones the repo gets the MCP server automatically — Claude Code loads it on every session. No per-developer setup required beyond `npx agntx init` once.

---

## Hosted service

The fastest way to get started is the hosted service at **[agntx.app](https://agntx.app)** — no infrastructure to manage.

`npx @agntxapp/agntx init` connects to the hosted backend by default.

---

## Self-hosting

Want to run agntx on your own infrastructure? See [`backend/README.md`](backend/README.md) for the schema and reference Edge Function implementations.

The hosted service includes production features not in the reference implementation: atomic conflict detection, billing enforcement, rate limiting, and pgvector similarity search for large projects.

---

## Documentation

- [How it works](./docs/how-it-works.md)
- [Tools reference](./docs/tools.md)
- [Authentication](./docs/auth.md)
- [Conflicts](./docs/conflicts.md)

---

## Contributing templates

Templates live in [`templates/combos/`](templates/combos/). Each one is a JSON file with stack-specific rules, gotchas, and architecture patterns.

To contribute:
1. Fork the repo
2. Copy an existing template as a starting point
3. Add your stack's real gotchas — the things that actually bit you
4. Open a PR

Good templates come from real experience. If you've been burned by a Supabase RLS policy or a React Native Metro cache issue, that belongs in a template.

---

## License

Apache 2.0 — see [LICENSE](LICENSE)

Copyright 2026 NTC DEV
