# Tools Reference

agntx adds 4 slash commands to every Claude session. They map to 4 MCP tools that Claude calls automatically.

---

## /status

Pull the shared context into your session and confirm understanding.

**Use it:** At the start of every session, before doing any work.

**What Claude does:**
1. Calls `context_status` — fetches current state, decisions, and open conflicts
2. Summarizes what it now knows: stack, current state, next priority
3. Lists any open conflicts
4. Ends with "Ready. What do you want to work on?"

Claude will not start any work until you give it a task.

---

## /save

Push this session's decisions and progress to the shared context.

**Use it:** At the end of a session, or whenever you want to sync progress with the team.

**What Claude does:**
1. Scans the full conversation history
2. Extracts: what was done, what's in progress, what's next, decisions made, files touched
3. Calls `context_save` with the structured result
4. Reports the new version number

**You don't write anything.** Claude extracts the session state itself — it has full conversation context, so extraction quality is high.

If another developer saved while you were working, you'll get a conflict instead. See [Conflicts](./conflicts.md).

---

## /resolve \<conflict_id\> \<A|B|both\>

Resolve a version conflict after a simultaneous save.

**Use it:** When `/status` shows an open conflict.

```
/resolve 30884f1f-d182-4b21-a332-f6268d4be9d0 B
```

**Options:**

| Option | Meaning | When to use |
|---|---|---|
| `A` | Your save wins — applies your stale save on top of current state | Your work should override what's there |
| `B` | Their save wins — keeps current state, discards your stale save | Their version is correct |
| `both` | Merge — combines `done[]` from both saves, keeps current `next_priority` | Both sessions completed valid work |

After resolving, run `/status` to confirm the new state.

---

## /diff

Show what changed in the shared context since you last pulled.

**Use it:** Before starting work, especially if other teammates have been active.

```
/diff
```

Shows the delta between your last pull and the current server state — new decisions, state changes, anything your session doesn't know about yet. Run it before diving in so you're not building on stale assumptions.

---

## Stop hook

During `npx @agntxapp/agntx init`, a Stop hook is added to `.claude/settings.json`. It runs after every Claude response and checks if files changed:

```
git diff --name-only --quiet || echo "💾 Files changed — run /save to sync context"
```

This is the adoption forcing function — you don't have to remember to save.
