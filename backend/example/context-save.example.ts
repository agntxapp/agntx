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

// context-save — example implementation
// POST /context-save
//
// This is a reference implementation showing the API contract.
// The hosted service at api.agntx.app includes atomic version checking
// via a Postgres transaction, billing enforcement, and conflict recording
// not shown here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  const token = bearerToken(req)
  if (!token) return response({ error: 'Missing Authorization header' }, 401)

  const db = serviceClient()

  const { data: tokenRow } = await db
    .from('team_tokens')
    .select('team_id')
    .eq('token', token)
    .single()

  if (!tokenRow) return response({ error: 'Invalid token' }, 401)

  // Expected payload (sent by Claude via the /save skill)
  const body = await req.json()
  const { project_slug, version, state_updates, decisions, files_touched, session_summary, stack, architecture, rules } = body

  if (!project_slug || version === undefined) {
    return response({ error: 'Missing project_slug or version' }, 400)
  }

  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('team_id', tokenRow.team_id)
    .eq('slug', project_slug)
    .single()

  if (!project) return response({ error: 'Project not found' }, 404)

  // NOTE: The production implementation checks version atomically in a
  // Postgres transaction to detect conflicts. This example does a
  // simplified non-atomic check for reference purposes only.
  const { data: ctx } = await db
    .from('project_contexts')
    .select('version, current_state')
    .eq('project_id', project.id)
    .single()

  const currentVersion = ctx?.version ?? 0
  const newVersion = currentVersion + 1

  await db.from('project_contexts').upsert({
    project_id:   project.id,
    version:      newVersion,
    current_state: { ...(ctx?.current_state ?? {}), ...state_updates },
    ...(stack        ? { stack }        : {}),
    ...(architecture ? { architecture } : {}),
    ...(rules        ? { rules }        : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id' })

  if (decisions?.length) {
    await db.from('decisions_log').insert(
      decisions.map((d: { decision: string; reason: string; rejected_alternatives: string[] }) => ({
        project_id: project.id,
        decision:   d.decision,
        reason:     d.reason,
        rejected_alternatives: d.rejected_alternatives ?? [],
      }))
    )
  }

  await db.from('sessions').insert({
    project_id:               project.id,
    summary:                  session_summary ?? null,
    files_touched:            files_touched ?? [],
    context_version_at_start: version,
  })

  return response({ status: 'ok', version: newVersion, decisions_saved: decisions?.length ?? 0 })
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
