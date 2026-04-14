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

export const diffInputSchema = z.object({
  since_version: z.number().int().min(0).optional().describe(
    'Show changes since this version. Defaults to version 0 (all changes).'
  ),
})

interface PullResponse {
  project: string
  version: number
  context: string
  is_empty?: boolean
}

export async function contextDiff(input: z.infer<typeof diffInputSchema>): Promise<string> {
  const config = getConfig()

  const res = await fetch(
    `${config.apiUrl}/functions/v1/context-pull?project_slug=${config.projectSlug}`,
    { headers: { Authorization: `Bearer ${config.teamToken}` } },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return `❌ Diff failed: ${(err as { error?: string }).error ?? res.statusText}`
  }

  const data = await res.json() as PullResponse

  if (data.is_empty) {
    return '✅ No context yet — nothing to diff.'
  }

  const sinceVersion = input.since_version ?? 0

  if (sinceVersion >= data.version) {
    return `✅ Context is up to date (v${data.version}) — no changes since v${sinceVersion}.`
  }

  return [
    `# Context Diff — v${sinceVersion} → v${data.version}`,
    `_${data.version - sinceVersion} update(s) since v${sinceVersion}_\n`,
    data.context,
    '\nRun **/pull** to sync the latest context into this session.',
  ].join('\n')
}
