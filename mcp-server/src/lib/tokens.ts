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

// Rough token estimator — ~4 chars per token.
// Good enough for deciding whether to truncate context.
// Replace with tiktoken before v2 if accuracy matters.

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export const TOKEN_LIMIT = 2000

export function isOverLimit(text: string): boolean {
  return estimateTokens(text) > TOKEN_LIMIT
}
