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

export const statusInputSchema = z.object({})

interface PullResponse {
  project: string
  version: number
  context: string
  conflicts: Array<{
    id: string
    version_a: number
    version_b: number
    data_a: Record<string, unknown>
    data_b: Record<string, unknown>
    created_at: string
  }>
  is_empty?: boolean
  truncated?: boolean
}

export async function contextStatus(_input: z.infer<typeof statusInputSchema>): Promise<string> {
  const config = getConfig()

  const res = await fetch(
    `${config.apiUrl}/functions/v1/context-pull?project_slug=${config.projectSlug}`,
    { headers: { Authorization: `Bearer ${config.teamToken}` } },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return `❌ Status failed: ${(err as { error?: string }).error ?? res.statusText}`
  }

  const data = await res.json() as PullResponse

  if (data.is_empty) {
    return `# ${data.project} — Status\n\n(no context yet — run /save after your first session)\n\nReady. What do you want to work on?`
  }

  const lines: string[] = [
    `# ${data.project} — Status`,
    `_Context v${data.version}_\n`,
    data.context,
  ]

  if (data.conflicts?.length > 0) {
    lines.push('\n---')
    lines.push(`\n⚠️ **${data.conflicts.length} open conflict(s)**\n`)
    for (const c of data.conflicts) {
      const yours  = c.data_b as Record<string, unknown>
      const theirs = c.data_a as Record<string, unknown>
      const yourNext  = (yours?.state_updates as Record<string, unknown>)?.next_priority
      const theirNext = (theirs?.current_state as Record<string, unknown>)?.next_priority

      lines.push(`**Conflict** (v${c.version_a} vs v${c.version_b})`)
      if (yourNext && theirNext && yourNext !== theirNext) {
        lines.push(`  next_priority:`)
        lines.push(`    [Yours]  "${yourNext}"`)
        lines.push(`    [Theirs] "${theirNext}"`)
      }
      lines.push(`  Run: **/resolve ${c.id} A** | **/resolve ${c.id} B** | **/resolve ${c.id} both**`)
    }
  }

  if (data.truncated) {
    lines.push('\n> ⚡ Large project — context truncated. Run /pull with a task description for better results.')
  }

  lines.push('\n---\nReady. What do you want to work on?')
  return lines.join('\n')
}
