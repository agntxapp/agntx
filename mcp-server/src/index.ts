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

import { Server }               from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { pullInputSchema,   contextPull   } from './tools/pull.js'
import { saveInputSchema,   contextSave   } from './tools/save.js'
import { statusInputSchema, contextStatus } from './tools/status.js'
import { diffInputSchema,   contextDiff   } from './tools/diff.js'

const server = new Server(
  { name: 'agntx', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name:        'context_pull',
      description: 'Pull the team\'s shared project context into this session. Call this at the start of every session BEFORE doing any work. The response includes the context version number — remember it, you will need it when calling context_save.',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'What you\'re about to work on — helps retrieve relevant context for large projects.',
          },
        },
      },
    },
    {
      name:        'context_save',
      description: `Save this session's decisions and progress to the shared team context. Call this when the user runs /save or asks to save the session.

Before calling this tool, extract the following from the conversation history:

**state_updates** — scan the full conversation and fill in:
- done: everything completed this session (be specific: "implemented X", "fixed Y")
- in_progress: anything started but not finished
- next_priority: the single most important next step, specific enough to act on without asking questions

**decisions** — 0 to 5 non-obvious decisions only. For each: what was decided, WHY (the actual reasoning), and what alternatives were considered and rejected. Skip obvious decisions (e.g. "used a for loop"). Only log architectural choices, library selections, patterns adopted, trade-offs made — things that could surprise a future developer.

**files_touched** — every file created or modified this session

**session_summary** — 2-3 sentences a teammate could read cold to understand what happened

**version** — the version number shown at the bottom of the context_pull response as "Context version: N". If no pull was done this session, use 0.

**Conflict resolution mode:** If the user runs /resolve <conflict_id> <A|B|both>, call this tool with ONLY these fields:
- conflict_id: the UUID from the conflict
- conflict_resolution: "A" (apply stale/yours), "B" (keep current/theirs), or "both" (merge done[] lists)
- version: 0
- state_updates: {}`,
      inputSchema: {
        type: 'object',
        required: ['version', 'state_updates'],
        properties: {
          version: {
            type: 'integer',
            description: 'The context version from the context_pull response at the start of this session.',
          },
          state_updates: {
            type: 'object',
            properties: {
              done:          { type: 'array', items: { type: 'string' }, description: 'Items completed this session' },
              in_progress:   { type: 'array', items: { type: 'string' }, description: 'Items still in progress' },
              next_priority: { type: 'string', description: 'The single most important next step — specific enough to act on without asking questions' },
            },
          },
          decisions: {
            type: 'array',
            description: 'Non-obvious decisions made this session. 0-5 entries max.',
            items: {
              type: 'object',
              required: ['decision', 'reason'],
              properties: {
                decision:              { type: 'string', description: 'What was decided' },
                reason:                { type: 'string', description: 'Why — the reasoning behind it' },
                rejected_alternatives: { type: 'array', items: { type: 'string' }, description: 'What else was considered and why not' },
              },
            },
          },
          files_touched:   { type: 'array', items: { type: 'string' }, description: 'Files created or modified this session' },
          session_summary: { type: 'string', description: '2-3 sentences for a teammate to read to understand what happened' },
        },
      },
    },
    {
      name:        'context_status',
      description: 'Get the current project state, next priorities, and any open conflicts. Call this when the user runs /status. After receiving the response, summarize what you know and end with "Ready. What do you want to work on?" — do not start any work until the user gives a task.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name:        'context_diff',
      description: 'Show what changed in the shared context since the last pull. Call this when the user runs /diff or before starting work on a task to avoid stale assumptions.',
      inputSchema: {
        type: 'object',
        properties: {
          since_version: { type: 'integer', description: 'Show changes since this version. Defaults to 0 (all changes).' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params

  try {
    let text: string

    switch (name) {
      case 'context_pull':
        text = await contextPull(pullInputSchema.parse(args ?? {}))
        break
      case 'context_save':
        text = await contextSave(saveInputSchema.parse(args ?? {}))
        break
      case 'context_status':
        text = await contextStatus(statusInputSchema.parse(args ?? {}))
        break
      case 'context_diff':
        text = await contextDiff(diffInputSchema.parse(args ?? {}))
        break
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }

    return { content: [{ type: 'text', text }] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('agntx mcp server crashed:', err)
  process.exit(1)
})
