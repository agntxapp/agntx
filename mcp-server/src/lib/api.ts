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

// All Supabase access goes through Edge Functions using the team token.
// The MCP server never holds a Supabase service key.

export async function fetchEdgeFunction(
  apiUrl: string,
  path: string,
  teamToken: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${apiUrl}/functions/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${teamToken}`,
      ...options.headers,
    },
  })
}
