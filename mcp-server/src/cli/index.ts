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

const cmd = process.argv[2]

if (cmd === 'init') {
  await import('./init.js')
} else if (cmd === undefined) {
  // No args — start MCP server (called by Claude Code via .mcp.json)
  await import('../index.js')
} else {
  process.stderr.write(
    `agntx: unknown command "${cmd}"\n\n` +
    `Usage:\n` +
    `  npx agntx        start MCP server (used by Claude Code via .mcp.json)\n` +
    `  npx agntx init   set up a new project\n`
  )
  process.exit(1)
}
