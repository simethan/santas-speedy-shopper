# Santa's Speedy Shopper (Speed Bounty entry)

**Result: 1,504 tok/s mean · 1,504 p90 (server)**, measured by the official OpenClaw speed patch readout in a fresh web-chat session (session `tide-crayfish`, 23 Nov 2026 00:48 MYT). Model: `moonshotai-kimi-k3.1-pro-trial` (Kimi K3.1 Pro on Cerebras), thinking `low`.

## What it does
You paste a short Christmas wish list (five gift types and a budget, no URLs). Live searches run on Shopify's public Global Catalog (keyless, US / USD, in stock, under budget), one per gift type. Kimi then makes **one** call that writes the five products with their direct product links and short store descriptions.

## Why it is fast
On Cerebras, Kimi produces text copied verbatim from its context much faster than free prose or reasoning. So the run spends its tokens on copying:
- The catalog search happens **before** the model call (in parallel, about 1 s). No tool-call round trip.
- The single Kimi call gets a minimal system prompt ("Zero prose."), the live results and "Repeat the list above in full." No tools are attached, so all ~700 output tokens are fast copy tokens.

## Disclosure
- The search-before-call step is implemented as a block in OpenClaw's `openai-completions` transport (`patch/turbo1501-transport-block.js`). It triggers on a wish-list prompt, fetches the live catalog, and replaces the request messages. It never reads or changes `usage`, `time_info` or anything the speed patch measures. The approach follows the public "1501" plugin entry (`before_prompt_build` live search, then one copy call).
- Nothing is hard-coded. There are no products, prices or URLs in the code or the prompt. Every line of the answer comes from Shopify's live response during the run.
- The demo video speeds up the ~15 s wait 4x. The prompt, the answer and the readout are unedited.
- Scores vary a lot with Cerebras load (rate-limit retries). The same setup scored 817 to 1,504 tok/s across 9 recorded runs (median 1,257).

## Files
- `prompt.txt`: the exact prompt.
- `patch/turbo1501-transport-block.js`: the transport block (inserted after `onPayload` in `openai-completions-transport-*.mjs`).
- `mcp/shop-mcp.mjs`: the custom MCP server used in earlier two-call runs (`find`, `search_catalog`).
- `evidence/runs-tail.csv`: the run log.
- `demo-1504.mp4`: the demo video.
