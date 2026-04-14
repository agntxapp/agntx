# Conflicts

A conflict happens when two developers save at the same time — both pulled version N, both did work, and one saves first (successfully reaching N+1). The second save gets rejected because the server is no longer at the expected version.

agntx surfaces the conflict instead of silently overwriting.

---

## How it happens

```
Developer A pulls v3 → works on auth → saves → ✅ now at v4
Developer B pulled v3 → works on onboarding → tries to save at v3 → ❌ conflict
```

Developer B's save is not lost. It's stored as a conflict record with both sides preserved.

---

## What you see

After the conflict, run `/status`:

```
⚠️ 1 open conflict

Conflict (v4 vs v3)
  next_priority:
    [Yours]   "Fix the onboarding bug first"
    [Theirs]  "Add user profile page"

  Run: /resolve 30884f1f A | /resolve 30884f1f B | /resolve 30884f1f both
```

agntx shows you the key difference — usually `next_priority` — so you can decide which direction is right before resolving.

---

## Resolving

```bash
/resolve <conflict_id> <A|B|both>
```

**`A` — your save wins**

Applies your stale save on top of the current server state. Your `state_updates` are merged in. Use this when your work is the right direction.

**`B` — their save wins**

Keeps the current server state exactly as-is. Your stale save is discarded. Use this when the server version is correct and your save is no longer relevant.

**`both` — merge**

Takes the union of `done[]` from both saves (deduplicated). Keeps the current `next_priority`. Use this when both sessions completed real work and you want to combine them.

---

## After resolving

Every resolution is automatically appended to the decisions log:

```json
{
  "decision": "Resolved version conflict (30884f1f) → B",
  "reason": "Kept current server state, discarded stale save"
}
```

Run `/status` after resolving to confirm the new state looks right.

---

## Conflict history

Conflict records are never deleted. The full history — what conflicted, when, and how it was resolved — is permanently preserved. This is intentional: understanding why a conflict was resolved a certain way can matter months later.
