#!/usr/bin/env node
// Copyright 2026 NTC DEV
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// npx agntx init — project bootstrap wizard
// Detects stack, applies template, generates CLAUDE.md + .claude/commands/ + .mcp.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const API_URL = 'https://api.agntx.app'

// ─── Prompts ──────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout })

async function ask(question: string, defaultVal = ''): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultVal ? `${question} (${defaultVal}): ` : `${question}: `
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal)
    })
  })
}

async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} [Y/n]`, 'Y')
  return answer.toLowerCase() !== 'n'
}

// ─── Stack detection ──────────────────────────────────────────────────────────

interface Template {
  slug: string
  label: string
  detects: { dependencies: string[] }
  stack: Record<string, string>
  rules: { always: string[]; never: string[]; gotchas: string[] }
  architecture: { folders: Record<string, string> }
  commands: string[]
}

function detectStack(cwd: string): Template | null {
  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) return null

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    return null
  }

  const allDeps = {
    ...pkg.dependencies ?? {},
    ...pkg.devDependencies ?? {},
  }

  const templateDir = join(__dirname, '../../templates/combos')
  // Hardcoded for now — will load from templates dir in v2
  const combos = ['expo+supabase', 'nextjs+supabase', 'nextjs+prisma']

  for (const combo of combos) {
    try {
      const tmpl: Template = JSON.parse(
        readFileSync(join(templateDir, `${combo}.json`), 'utf-8')
      )
      const allDetected = tmpl.detects.dependencies.every((dep) => dep in allDeps)
      if (allDetected) return tmpl
    } catch {
      continue
    }
  }

  return null
}

// ─── File generators ──────────────────────────────────────────────────────────

function generateClaudeMd(opts: {
  projectName: string
  description: string
  currentState: string
  template: Template | null
}): string {
  const { projectName, description, currentState, template } = opts
  const today = new Date().toISOString().split('T')[0]

  const stackSection = template
    ? Object.entries(template.stack).map(([k, v]) => `- **${k}**: ${v}`).join('\n')
    : '(fill in your stack)'

  const alwaysDo = template
    ? template.rules.always.map((r) => `- ${r}`).join('\n')
    : '- (add your rules)'

  const neverDo = template
    ? template.rules.never.map((r) => `- ${r}`).join('\n')
    : '- (add your constraints)'

  const gotchas = template
    ? template.rules.gotchas.map((r) => `- ${r}`).join('\n')
    : '- (add known gotchas)'

  const folderMap = template
    ? Object.entries(template.architecture.folders)
        .map(([k, v]) => `  ${k.padEnd(30)} — ${v}`)
        .join('\n')
    : '  (fill in your folder structure)'

  return `# Project: ${projectName}
> ${description}

---

## Stack
${stackSection}

---

## Architecture

### Key Files & Folders
\`\`\`
${folderMap}
\`\`\`

---

## Rules & Constraints

### Always Do
${alwaysDo}

### Never Do
${neverDo}

### Known Gotchas
${gotchas}

---

## Current State
> Last updated: ${today}

### Done & Working
${currentState ? `- ${currentState}` : '- (nothing yet — greenfield)'}

### In Progress
- (nothing yet)

### Next Priority
- (set after first session)

---

## Decisions Log
> Append new entries. Never delete old ones.

| Date | Decision | Why | Alternatives Rejected |
|------|----------|-----|-----------------------|
| ${today} | Used ${template?.label ?? 'custom'} template | ${template ? 'Matches project stack' : 'Manual setup'} | |

---

## Session Notes
> Updated by /save after each session.

(empty — run /save to write the first entry)
`
}

function generateSaveCommand(): string {
  return `# /save — Save Session Context

Extract from this session and call context_save with the structured JSON below.
Include only **non-obvious** decisions — skip anything self-evident from the code.

## Schema

\`\`\`json
{
  "version": <number — the version you pulled at session start>,
  "state_updates": {
    "done": ["<completed items>"],
    "in_progress": ["<what is still being worked on>"],
    "next_priority": "<single most important next step>"
  },
  "decisions": [
    {
      "decision": "<what was decided>",
      "reason": "<why — the thinking behind it>",
      "rejected_alternatives": ["<what else was considered and why not>"]
    }
  ],
  "files_touched": ["<list of files modified>"],
  "session_summary": "<2-3 sentences: what happened, what changed, what to know next session>"
}
\`\`\`

## Rules
- decisions[] should have 0-5 entries — only decisions worth preserving
- session_summary is for the next developer (or you next session) to read at a glance
- next_priority must be specific enough to act on without asking questions
`
}

function generateResolveCommand(): string {
  return `# /resolve — Resolve a Version Conflict

Called as: \`/resolve <conflict_id> <A|B|both>\`

Parse the conflict_id (UUID) and resolution from the command text, then call context_save with:
- conflict_id: the UUID
- conflict_resolution: "A", "B", or "both" (uppercase A/B)
- version: 0
- state_updates: {}

Resolution meanings:
- **A** (yours wins): Applies the stale save on top of current state — use if your work should override
- **B** (theirs wins): Keeps current server state, discards the stale save — use if theirs is correct
- **both**: Merges done[] lists from both saves, keeps current next_priority — use when both are valid

After resolving, run /status to confirm the new state.
`
}

function generateStatusCommand(): string {
  return `# /status — Load Project Context

Call context_status to get the current project state, then confirm understanding.

After receiving the status output:
1. Summarize what you now know: current state, constraints, next priority
2. List any open conflicts if present
3. End with: "Ready. What do you want to work on?"

Do NOT make any changes until the user gives a task.
`
}

function generateMcpJson(opts: {
  projectSlug: string
  teamToken: string
}): string {
  return JSON.stringify({
    mcpServers: {
      agntx: {
        command: 'npx',
        args: ['-y', '@agntxapp/agntx'],
        env: {
          AGNTX_TEAM_TOKEN:   opts.teamToken,
          AGNTX_PROJECT_SLUG: opts.projectSlug,
          AGNTX_API_URL:      API_URL,
        },
      },
    },
  }, null, 2)
}

function generateSettingsJson(): string {
  return JSON.stringify({
    hooks: {
      Stop: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: 'git diff --name-only --quiet 2>/dev/null || echo "\\n💾 Files changed this session — run /save to sync context with your team."',
            },
          ],
        },
      ],
    },
  }, null, 2)
}


class SlugTakenError extends Error {}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function registerProject(projectName: string, projectSlug: string, templateSlug?: string): Promise<string> {
  const res = await fetch(`${API_URL}/functions/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_name: projectName, project_slug: projectSlug, template_slug: templateSlug }),
  })
  const data = await res.json() as { status?: string; token?: string; error?: string }
  if (res.status === 409) throw new SlugTakenError(data.error ?? `"${projectSlug}" is already taken`)
  if (!res.ok || !data.token) throw new Error(data.error ?? 'Registration failed')
  return data.token
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cwd = process.cwd()
  console.log('\n🔧 agntx init\n')

  // Detect stack
  const template = detectStack(cwd)
  if (template) {
    const use = await confirm(`Detected ${template.label} — use this template?`)
    if (!use) {
      console.log('Proceeding without template.')
    }
  }

  const activeTemplate = template ?? null

  // 3 questions — but register first (fail fast before asking description/state)
  let projectName = await ask('Project name')
  let projectSlug = toSlug(projectName)
  let teamToken: string

  // Registration with retry on slug collision
  // eslint-disable-next-line no-constant-condition
  while (true) {
    process.stdout.write('  Registering project...')
    try {
      teamToken = await registerProject(projectName, projectSlug, activeTemplate?.slug)
      process.stdout.write(' ✓\n\n')
      break
    } catch (err) {
      process.stdout.write(' ✗\n')
      if (err instanceof SlugTakenError) {
        console.log(`  ⚠️  "${projectSlug}" is already taken.`)
        projectName = await ask('  Choose a different project name')
        projectSlug = toSlug(projectName)
        continue
      }
      throw err
    }
  }

  const description  = await ask('One-line description')
  const currentState = await ask('What\'s already built? (leave blank if greenfield)', '')

  // Create .claude/commands/
  const commandsDir = join(cwd, '.claude', 'commands')
  mkdirSync(commandsDir, { recursive: true })

  writeFileSync(join(commandsDir, 'save.md'),    generateSaveCommand())
  writeFileSync(join(commandsDir, 'status.md'),  generateStatusCommand())
  writeFileSync(join(commandsDir, 'resolve.md'), generateResolveCommand())

  // Stack-specific commands
  if (activeTemplate?.commands.includes('eas-build')) {
    writeFileSync(join(commandsDir, 'eas-build.md'), `# /eas-build — EAS Build Reminder

Before triggering a build:
- All secrets must be in EAS dashboard (not .env)
- Run: eas build --platform all --profile preview
- EAS ignores local .env — verify env vars in eas.json
`)
  }
  if (activeTemplate?.commands.includes('rls-check')) {
    writeFileSync(join(commandsDir, 'rls-check.md'), `# /rls-check — RLS Policy Checklist

Before any new table goes to production:
- [ ] ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;
- [ ] At minimum: one SELECT policy for authenticated users
- [ ] Test with a second user account in Supabase SQL editor
- [ ] Service role bypasses RLS — only use in Edge Functions, never in client
`)
  }
  if (activeTemplate?.commands.includes('types-gen')) {
    writeFileSync(join(commandsDir, 'types-gen.md'), `# /types-gen — Regenerate Supabase Types

Run after any schema change (migration applied or table edited in Dashboard):

\`\`\`bash
supabase gen types typescript --linked > src/types/supabase.ts
\`\`\`

Then check: does any existing query now have a TypeScript error? Fix it before moving on.
If you don't have supabase CLI: npm install -g supabase
`)
  }
  if (activeTemplate?.commands.includes('prisma-migrate')) {
    writeFileSync(join(commandsDir, 'prisma-migrate.md'), `# /prisma-migrate — New Prisma Migration

\`\`\`bash
npx prisma migrate dev --name <description>
\`\`\`

Checklist before applying:
- [ ] Only one concern per migration
- [ ] Run locally first — check the generated SQL in prisma/migrations/
- [ ] Never edit migration files after they are committed
- [ ] After applying: run /prisma-generate to update TypeScript types
- [ ] In production: npx prisma migrate deploy (not migrate dev)
`)
  }
  if (activeTemplate?.commands.includes('prisma-generate')) {
    writeFileSync(join(commandsDir, 'prisma-generate.md'), `# /prisma-generate — Regenerate Prisma Client

Run after any change to prisma/schema.prisma:

\`\`\`bash
npx prisma generate
\`\`\`

Also runs automatically on npm install via postinstall (if configured).
If TypeScript shows errors on Prisma model types, this is almost always the fix.
`)
  }
  if (activeTemplate?.commands.includes('migration')) {
    writeFileSync(join(commandsDir, 'migration.md'), `# /migration — New Supabase Migration

\`\`\`bash
supabase migration new <name>
\`\`\`

Checklist before applying:
- [ ] One concern per migration file
- [ ] Includes a down migration (commented if irreversible)
- [ ] RLS enabled on any new table
- [ ] Run locally first: supabase db reset
- [ ] After applying: run /types-gen to regenerate TypeScript types
`)
  }

  // Generate files
  writeFileSync(join(cwd, 'CLAUDE.md'), generateClaudeMd({
    projectName,
    description,
    currentState,
    template: activeTemplate,
  }))

  writeFileSync(join(cwd, '.mcp.json'), generateMcpJson({ projectSlug, teamToken }))

  // .claude/settings.json (Stop hook)
  const settingsDir = join(cwd, '.claude')
  mkdirSync(settingsDir, { recursive: true })
  writeFileSync(join(settingsDir, 'settings.json'), generateSettingsJson())

  // Output
  console.log('\n✅ Done.\n')
  console.log(`  CLAUDE.md created${activeTemplate ? ` (${activeTemplate.label} template)` : ''}`)
  console.log(`  .claude/commands/save.md`)
  console.log(`  .claude/commands/status.md`)
  console.log(`  .claude/commands/resolve.md`)
  if (activeTemplate?.commands.includes('eas-build')) console.log(`  .claude/commands/eas-build.md`)
  if (activeTemplate?.commands.includes('rls-check')) console.log(`  .claude/commands/rls-check.md`)
  if (activeTemplate?.commands.includes('types-gen'))      console.log(`  .claude/commands/types-gen.md`)
  if (activeTemplate?.commands.includes('migration'))      console.log(`  .claude/commands/migration.md`)
  if (activeTemplate?.commands.includes('prisma-migrate')) console.log(`  .claude/commands/prisma-migrate.md`)
  if (activeTemplate?.commands.includes('prisma-generate')) console.log(`  .claude/commands/prisma-generate.md`)
  console.log(`  .mcp.json`)
  console.log(`  .claude/settings.json (Stop hook)\n`)
  console.log(`  Team token: ${teamToken}`)
  console.log(`  Project:    ${projectSlug}\n`)
  console.log(`  ⚠️  Commit .mcp.json to git — teammates inherit the MCP server automatically.`)
  console.log(`  ⚠️  Keep the team token secret — add it to .gitignore or use git-crypt.\n`)
  console.log(`  Free during beta — no limits, no credit card needed.\n`)
  console.log(`  Run /status to start your first session.\n`)
  rl.close()
}

main().catch((err) => {
  console.error('agntx init failed:', err.message)
  process.exit(1)
})
