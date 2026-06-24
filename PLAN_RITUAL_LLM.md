# Plan: Siggy → Ritual on-chain LLM (precompile 0x0802)

## Why
Current `/ask-siggy` shells out to the `sovereign-agent` example (`0x080C`) which spawns a full Crush CLI agent in a TEE and pays OpenAI per call. Cost: **~0.32 RITUAL per call**.

Switching to the **LLM precompile (`0x0802`)** = single-shot inference on Ritual's own hosted GLM-4.7-FP8 model. No CLI agent. No OpenAI fee. Estimated **~0.01–0.05 RITUAL per call** (10–30× cheaper), full Siggy persona preserved.

Bonus: pure TypeScript (no Python/forge), so it works on **both** the VPS Discord bot AND Vercel (Next.js API route) — unifying the web chat and Discord paths.

## Architecture

```
Discord /ask-siggy          Next.js /api/siggy-onchain
        │                              │
        └────────────┬─────────────────┘
                     │
                     ▼
       siggy-bot/lib/ritual-llm.ts  (new)
                     │
        1. read TEEServiceRegistry → executor
        2. build messages (SIGGY_CORE_IDENTITY + user)
        3. encodeAbiParameters (30-field tuple)
        4. sendTransaction → 0x0802 (no contract)
        5. wait receipt → decode PrecompileCalled event
                     │
                     ▼
              { content, usage, finishReason }
```

No Solidity contract needed — EOA calls precompile directly per skill `ritual-dapp-llm` §1.

## Constants (Ritual testnet, chain 1979)

| Name | Address |
|---|---|
| LLM precompile | `0x0000000000000000000000000000000000000802` |
| TEEServiceRegistry | `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F` |
| RitualWallet | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` |
| Model (pinned) | `zai-org/GLM-4.7-FP8` |
| Capability enum | `LLM = 1` |

## Files to add/change

1. **`siggy-bot/lib/ritual-llm.ts`** — new. Pure TS. Exports `callRitualLLM({ system, user, privateKey, rpcUrl }) → Promise<{ content, finishReason, usage, txHash }>`.
2. **`siggy-bot/discord-bot/commands/ask-siggy.cjs`** — swap shell-out for `callRitualLLM`. (Node `.cjs` consumes the compiled `.js` from `dist/lib/ritual-llm.js` — see step 6 below for compile path.)
3. **`siggy-bot/app/api/siggy-onchain/route.ts`** — new Next.js route. POST `{ message }` → `{ content, txHash }`. Bonus deliverable.
4. **`siggy-bot/package.json`** — add deps: `viem` (likely already there transitively via Next? check), no extra needed (eciesjs not required — no encryptedSecrets since GLM is Ritual-hosted, no OpenAI key to encrypt, convoHistory empty).

## ABI tuple (30 fields, locked literal from skill docs)

See `lib/ritual-llm.ts` source. Critical values for cheap Siggy chat:
- `ttl`: 300 blocks
- `maxCompletionTokens`: 4096 (GLM-4.7-FP8 reasoning model needs ≥4096)
- `temperature`: 700 (= 0.7)
- `topP`: 1000 (= 1.0)
- `reasoningEffort`: `'low'` (was `medium` in docs; lower = faster + cheaper)
- `stream`: false
- `piiEnabled`: false
- `convoHistory`: `('', '', '')` empty tuple — no DA storage, stateless per call (this matches Siggy's stateless web chat pattern; conversation context is rebuilt from prompt each time)

## Execution steps

1. **Verify viem available in siggy-bot.** If not, `npm i viem`.
2. **Write `lib/ritual-llm.ts`.** Single function, ~120 LOC. Includes:
   - `getExecutor()` — reads TEEServiceRegistry, picks first valid LLM service
   - `buildRequest(system, user, executor)` — encodes 30-field tuple
   - `extractResult(receipt)` — finds `PrecompileCalled` log, unwraps async envelope, decodes CompletionData → returns text content
   - `callRitualLLM()` — orchestrator
3. **Test it standalone** with a tsx script: `npx tsx scripts/test-ritual-llm.ts "hai siggy"` → expect on-chain response with persona.
4. **Measure actual cost.** Read RitualWallet balance before/after; report real per-call delta.
5. **Wire `/ask-siggy`** to call it instead of `run.sh`. Update embed.
6. **Wire `/api/siggy-onchain`** route for web. (Optional this session — defer if time-bound.)
7. **Update README/CLAUDE notes** with on-chain mode toggle.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| 30-field tuple typo → `-32602 invalid async payload` | Copy literal `parseAbiParameters` string from skill verbatim |
| Empty `convoHistory` rejected | Skill explicitly documents empty `('','','')` as valid; if not, fall back to dummy hf tuple |
| GLM-4.7-FP8 not available | `getServicesByCapability` empty list → fail fast with explicit error |
| Settlement not in receipt | Skill: precompile call settles in same block as commitment (short-running async). Poll receipt up to 30s |
| viem missing from siggy-bot | `npm i viem` — small, no peer issues with Next 14 |

## Out of scope (this session)

- Streaming (SSE) — Discord doesn't stream embeds anyway
- ECIES encrypted secrets (only needed if calling external LLM, but GLM is on-platform — empty `[]` is correct)
- Multi-turn convoHistory persistence — Siggy web chat already manages context client-side
- Mood/sprite parsing — `/ask-siggy` reply still includes `[MOOD:xxx]` tag from persona, surfaces raw

## Acceptance criteria

- [ ] `npx tsx scripts/test-ritual-llm.ts "test"` returns Siggy-styled text + tx hash
- [ ] Real per-call cost measured & under 0.05 RITUAL
- [ ] `/ask-siggy` in Discord uses new path, embed shows tx hash + cost-relevant info
- [ ] No new deps beyond `viem` (if not already present)
