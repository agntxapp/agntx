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

// context-pull — example implementation
// GET /context-pull?project_slug=<slug>&task=<optional>
//
// This is a reference implementation showing the API contract.
// The hosted service at api.agntx.app includes token budgeting,
// pgvector similarity search, and caching not shown here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'GET') return response({ error: 'Method not allowed' }, 405)

  // 1. Authenticate via team token
  const token = bearerToken(req)
  if (!token) return response({ error: 'Missing Authorization header' }, 401)

  const db = serviceClient()

  const { data: tokenRow } = await db
    .from('team_tokens')
    .select('team_id')
    .eq('token', token)
    .single()

  if (!tokenRow) return response({ error: 'Invalid token' }, 401)

  // 2. Resolve project
  const url = new URL(req.url)
  const projectSlug = url.searchParams.get('project_slug')
  if (!projectSlug) return response({ error: 'Missing project_slug' }, 400)

  const { data: project } = await db
    .from('projects')
    .select('id, name')
    .eq('team_id', tokenRow.team_id)
    .eq('slug', projectSlug)
    .single()

  if (!project) return response({ error: 'Project not found' }, 404)

  // 3. Fetch context
  const { data: ctx } = await db
    .from('project_contexts')
    .select('version, stack, architecture, rules, current_state')
    .eq('project_id', project.id)
    .single()

  if (!ctx) {
    return response({
      project: project.name,
      version: 0,
      context: '(no context saved yet)',
      is_empty: true,
    })
  }

  // 4. Fetch recent decisions
  const { data: decisions } = await db
    .from('decisions_log')
    .select('decision, reason')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 5. Build context string
  const parts = [`# Project: ${project.name}`]
  if (Object.keys(ctx.stack).length)        parts.push(`## Stack
${JSON.stringify(ctx.stack, null, 2)}`)
  if (Object.keys(ctx.architecture).length) parts.push(`## Architecture
${JSON.stringify(ctx.architecture, null, 2)}`)
  if (Object.keys(ctx.rules).length)        parts.push(`## Rules
${JSON.stringify(ctx.rules, null, 2)}`)
  if (Object.keys(ctx.current_state).length) parts.push(`## Current State
${JSON.stringify(ctx.current_state, null, 2)}`)
  if (decisions?.length) {
    parts.push(`## Recent Decisions
${decisions.map((d) => `- **${d.decision}** — ${d.reason}`).join('
')}`)
  }

  return response({
    project: project.name,
    version: ctx.version,
    context: parts.join('

'),
    conflicts: [],
  })
})

function bearerToken(req: Request) {
  const h = req.headers.get('Authorization')
  return h?.startsWith('Bearer ') ? h.slice(7) : null
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
