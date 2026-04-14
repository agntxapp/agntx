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

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface AgntxConfig {
  teamToken:   string
  projectSlug: string
  apiUrl:      string
}

let _config: AgntxConfig | null = null

export function getConfig(): AgntxConfig {
  if (_config) return _config

  // Load from .mcp.json env section or process.env
  const teamToken   = process.env.AGNTX_TEAM_TOKEN   ?? readMcpEnv('AGNTX_TEAM_TOKEN')
  const projectSlug = process.env.AGNTX_PROJECT_SLUG ?? readMcpEnv('AGNTX_PROJECT_SLUG')
  const rawApiUrl   = process.env.AGNTX_API_URL       ?? readMcpEnv('AGNTX_API_URL') ?? 'https://api.agntx.app'

  if (!teamToken || !projectSlug) {
    throw new Error(
      'agntx: missing AGNTX_TEAM_TOKEN or AGNTX_PROJECT_SLUG.\nRun: npx @agntxapp/agntx init'
    )
  }

  const apiUrl = validateApiUrl(rawApiUrl)

  _config = { teamToken, projectSlug, apiUrl }
  return _config
}

function validateApiUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const isLocalhost = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    if (parsed.protocol === 'http:' && !isLocalhost) {
      throw new Error('HTTP only allowed for localhost')
    }
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      throw new Error('Invalid protocol — must be https')
    }
    return url
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Invalid')) throw e
    throw new Error(`Invalid AGNTX_API_URL: ${url}`)
  }
}

function readMcpEnv(key: string): string | undefined {
  // Claude Code passes env vars from .mcp.json — they're in process.env already.
  // This is a fallback for local dev without .mcp.json.
  try {
    const mcpPath = resolve(process.cwd(), '.mcp.json')
    if (!existsSync(mcpPath)) return undefined
    const mcp = JSON.parse(readFileSync(mcpPath, 'utf-8'))
    return mcp?.mcpServers?.agntx?.env?.[key]
  } catch {
    return undefined
  }
}
