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

import { z } from 'zod'
import { getConfig } from '../config.js'

export const saveInputSchema = z.object({
  state_updates: z.object({
    done:          z.array(z.string()).optional(),
    in_progress:   z.array(z.string()).optional(),
    next_priority: z.string().optional(),
  }).optional().default({}),
  decisions: z.array(z.object({
    decision:              z.string(),
    reason:                z.string(),
    rejected_alternatives: z.array(z.string()).default([]),
  })).default([]),
  files_touched:   z.array(z.string()).default([]),
  session_summary: z.string().optional(),
  // Optional: patch full sections
  stack:        z.record(z.unknown()).optional(),
  architecture: z.record(z.unknown()).optional(),
  rules:        z.record(z.unknown()).optional(),
  version: z.number().int().min(0).default(0),
  // Conflict resolution — when present, routes to conflict-resolve instead of context-save
  conflict_id:         z.string().uuid().optional(),
  conflict_resolution: z.enum(['A', 'B', 'both']).optional(),
})

export async function contextSave(input: z.infer<typeof saveInputSchema>): Promise<string> {
  const config = getConfig()

  // Conflict resolution path
  if (input.conflict_id && input.conflict_resolution) {
    const res = await fetch(`${config.apiUrl}/functions/v1/conflict-resolve`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${config.teamToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_slug: config.projectSlug,
        conflict_id:  input.conflict_id,
        resolution:   input.conflict_resolution,
      }),
    })

    const data = await res.json() as { status: string; version?: number; resolution?: string; error?: string }

    if (!res.ok || data.status !== 'ok') {
      return `❌ Resolve failed: ${data.error ?? res.statusText}`
    }

    const label = { A: 'yours', B: 'theirs', both: 'merged' }[input.conflict_resolution]
    return `✅ Conflict resolved (v${data.version}) — kept **${label}**\nRun **/status** to confirm the current state.`
  }

  // Normal save path
  const res = await fetch(`${config.apiUrl}/functions/v1/context-save`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${config.teamToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_slug: config.projectSlug,
      ...input,
    }),
  })

  const data = await res.json() as {
    status: 'ok' | 'conflict'
    version?: number
    decisions_saved?: number
    conflict_id?: string
    hint?: string
    yours?: unknown
    theirs?: unknown
  }

  if (data.status === 'conflict') {
    return [
      '⚠️ **Version conflict** — another team member saved while you were working.',
      '',
      `Run **/status** to see both versions and resolve.`,
      `Conflict ID: \`${data.conflict_id}\``,
      data.hint ?? '',
    ].join('\n')
  }

  const lines = [
    `✅ Context saved (v${data.version})`,
  ]

  if ((data.decisions_saved ?? 0) > 0) {
    lines.push(`📝 ${data.decisions_saved} decision(s) logged`)
  }

  if (input.files_touched.length > 0) {
    lines.push(`📁 Files: ${input.files_touched.join(', ')}`)
  }

  return lines.join('\n')
}
