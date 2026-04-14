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

export const pullInputSchema = z.object({
  task: z.string().optional().describe('Current task description — used for similarity search on large projects'),
})

export async function contextPull(input: z.infer<typeof pullInputSchema>): Promise<string> {
  const config = getConfig()

  const url = new URL(`${config.apiUrl}/functions/v1/context-pull`)
  url.searchParams.set('project_slug', config.projectSlug)
  if (input.task) url.searchParams.set('task', input.task)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${config.teamToken}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return `❌ Pull failed: ${(err as { error?: string }).error ?? res.statusText}`
  }

  const data = await res.json() as {
    project: string
    version: number
    context: string
    conflicts: Array<{ id: string; version_a: number; version_b: number; data_a: unknown; data_b: unknown }>
    is_empty?: boolean
    truncated?: boolean
  }

  let output = data.context

  if (data.truncated) {
    output += '\n\n> ⚡ Large project — showing relevant sections only. Run /pull with a task description for better results.'
  }

  if (data.conflicts?.length > 0) {
    output += `\n\n⚠️ **${data.conflicts.length} open conflict(s)** — run /status to resolve.`
  }

  // Pin the version explicitly so Claude can pass it to context_save
  output += `\n\n---\n_Context version: **${data.version}** — pass this as \`version\` when calling context_save._`

  return output
}
