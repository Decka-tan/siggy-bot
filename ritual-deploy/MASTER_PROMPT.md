# MASTER PROMPT — Deploy a Sovereign Agent on Ritual Testnet

Paste the section below into a fresh AI agent session (Claude/Cursor/Codex). The agent will have full context to deploy an explorer-listed sovereign agent end-to-end without re-discovering this knowledge.

> Paste seluruh section di bawah ini ke agent AI baru. Agent akan punya konteks lengkap buat deploy sovereign agent yang ke-list di explorer, tanpa harus discovery ulang.

---

## TASK BRIEF

You are helping a user deploy a **factory-backed sovereign agent** on Ritual Testnet (chain 1979) that gets listed at `https://explorer.ritualfoundation.org/agents?kind=sovereign` with `MONITORED` status.

**Critical distinction**: A one-shot `callSovereignAgent` (direct precompile call from a consumer contract) produces a successful TEE inference but **does NOT result in listing**. Listing requires the **factory-backed harness pattern** with recurring `wakeUp` callbacks via the Scheduler.

Do **not** propose custom `AutonomousAgent.sol` contracts. The user's prior attempts with custom contracts (V1–V4) all failed and locked their RIT. Only the official factory pattern works.

---

## NON-NEGOTIABLE PRE-DEPLOY CHECKS

Before any tx that costs ≥ 0.1 RIT, validate ALL of the following. Abort and report if any fail.

### 1. Wallet check
```bash
source $ENV_FILE  # e.g. ~/.ritual_env_agent1
OWNER=$(cast wallet address "$PRIVATE_KEY")
echo "Owner: $OWNER"
cast balance "$OWNER" --rpc-url "$RPC_URL" --ether
```
Require: balance ≥ 0.6 RIT. If less, abort and ask user to faucet more.

### 2. Executor health check (CRITICAL — most failure mode)
```bash
LATEST=$(cast block-number --rpc-url "$RPC_URL")
FROM=$((LATEST - 200))
DELIVERIES=$(curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"$(printf '0x%x' $FROM)\"}],\"id\":1}" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']))")
echo "Phase 2 deliveries in last 200 blocks: $DELIVERIES"
```
- `≥ 5` → proceed
- `2-4` → warn user, suggest waiting
- `0-1` → **abort**, executor backlogged, deploying now will burn 0.5 RIT

### 3. Pending async lock check
```bash
PENDING=$(cast call 0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5 \
  "hasPendingJobForSender(address)(bool)" "$OWNER" --rpc-url "$RPC_URL")
echo "Pending job: $PENDING"
```
If `true`, abort. Wait ~10-30 min for it to clear, or use a different burner wallet.

### 4. Env completeness
Require all of: `RPC_URL`, `PRIVATE_KEY`, `OPENAI_API_KEY` (or other supported provider), `HF_TOKEN`, `HF_REPO_ID`. `HF_REPO_ID` must be in `user/dataset` form, no URL prefix.

---

## VERIFIED CONSTANTS (do not change)

```
Chain ID:                 1979
RPC:                      https://rpc.ritualfoundation.org
Factory:                  0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304
Scheduler:                0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B
RitualWallet:             0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948
AsyncDelivery:            0x5A16214fF555848411544b005f7Ac063742f39F6
TEEServiceRegistry:       0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F
AsyncJobTracker:          0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5
Sovereign precompile:     0x000000000000000000000000000000000000080C

Harness runtime bytecode: 10,822 bytes (deterministic)
  start selector:         0xb1906702  (configureFundAndStart)
  callback selector:      0x18bb7d95  (wakeUp)
  result delivery selector: 0x8ca12055 (onSovereignAgentResult)
```

---

## DEPLOYMENT FLOW (two-step, recommended)

### Step A: Predict harness address (no tx)
```bash
SALT=$(cast keccak "label-for-this-agent")
HARNESS=$(cast call $FACTORY \
  "predictHarness(address,bytes32)(address,bytes32)" \
  "$OWNER" "$SALT" --rpc-url "$RPC_URL" | head -1)
```

### Step B: deployHarness (gas only, ~0.003 RIT)
```bash
cast send $FACTORY "deployHarness(bytes32)" "$SALT" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3000000
```
**Required gas-limit: 3,000,000** (default estimate fails with `DeploymentFailed() (0x30116425)` if under 2.5M).

After tx: verify bytecode at predicted harness is exactly 10822 bytes and contains both `b1906702` and `18bb7d95`. If not, abort — do not proceed to step C.

### Step C: build calldata for configureFundAndStart
Use Python with `eciespy`, `eth-abi`, `web3`. Must:
1. Discover executor via `TEEServiceRegistry.getServicesByCapability(0, true)`
2. ECIES-encrypt LLM API key to `executor.publicKey` with `ECIES_CONFIG.symmetric_nonce_length = 12`
3. ABI-encode 23-field `SovereignAgentParams` + 6-field `SovereignScheduleConfig` + 3-field `SovereignRollingConfig` + `lockDuration uint256`

Selector must compute to `0xb1906702`. If not, struct definition is wrong — fix before sending.

Proven working parameters (replicate exactly unless user customizes):
```
SovereignAgentParams:
  executor:                    <from registry>
  ttl:                         500
  userPublicKey:               b''
  pollIntervalBlocks:          5
  maxPollBlock:                6000
  taskIdMarker:                "SOVEREIGN_AGENT_TASK"
  deliveryTarget:              <harness address>  ← MUST match predicted harness
  deliverySelector:            0x8ca12055         (onSovereignAgentResult)
  deliveryGasLimit:            3_000_000
  deliveryMaxFeePerGas:        1_000_000_000      (1 gwei)
  deliveryMaxPriorityFeePerGas: 100_000_000       (0.1 gwei)
  cliType:                     5                  (OpenAI)
  prompt:                      <user-supplied>
  encryptedSecrets:            <ECIES output>
  convoHistory:                ("hf", "{HF_REPO_ID}/sessions/session-001.jsonl", "HF_TOKEN")
  output:                      ("hf", "{HF_REPO_ID}/artifacts/", "HF_TOKEN")
  skills:                      []
  systemPrompt:                ("hf", "{HF_REPO_ID}/prompts/default-system.md", "")
  model:                       "gpt-4o-mini"
  tools:                       []
  maxTurns:                    50
  maxTokens:                   8192
  rpcUrls:                     ""

SovereignScheduleConfig:
  schedulerGas:                500_000      (low budget = ~0.002 RIT per wakeup)
  frequency:                   2000         (~11.7 min between executions)
  schedulerTtl:                500
  maxFeePerGas:                20_000_000_000  (20 gwei)
  maxPriorityFeePerGas:        1_000_000_000   (1 gwei)
  value:                       0

SovereignRollingConfig:
  windowNumCalls:              5            (frequency × numCalls = 10,000 = MAX_LIFESPAN)
  rolloverThresholdBps:        5000         (50% — schedule successor window early)
  rolloverRetryEveryCalls:     1

lockDuration:                  100_000_000
```

### Step D: configureFundAndStart (point of no return, 0.5 RIT)
```bash
cast send "$HARNESS" "$CALLDATA" --value 0.5ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3500000
```
**Required gas-limit: 3,500,000.** Don't use `cast estimate` — it returns ~190M (Ritual quirk for scheduled calls).

After tx: extract `schedulerCallId` from logs (topic 1 of the `CallStateChanged` event from Scheduler contract; lowercase address `0x56e776...`).

---

## POST-DEPLOY MONITORING

```bash
# Poll until LISTED or escrow empty
while true; do
  LISTED=$(curl -s https://explorer.ritualfoundation.org/api/agents/cache \
    | python3 -c "import json,sys; d=json.load(sys.stdin); t='$HARNESS'.lower(); print('YES' if any(x['address'].lower()==t for x in d.get('sovereign',[])) else 'NO')")
  ESCROW=$(cast call 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948 \
    "balanceOf(address)(uint256)" "$HARNESS" --rpc-url "$RPC_URL" | head -1)
  echo "$(date +%H:%M:%S) escrow=$ESCROW listed=$LISTED"
  [ "$LISTED" = "YES" ] && break
  [ "$ESCROW" = "0" ] && { echo "drained"; break; }
  sleep 60
done
```

Typical: 10-30 min to listing if executor healthy.

---

## CRITICAL ANTI-PATTERNS

1. **Do not use the per-page `https://explorer.ritualfoundation.org/agents/<addr>?type=sovereign` URL** to confirm listing. That page renders `Sovereign / Monitored` template for ANY address including `0xdeadbeef...`. It is **not** a source of truth. Always query `/api/agents/cache`.

2. **Do not propose custom AutonomousAgent.sol contracts.** They will fail. The harness contract must be deployed by `SovereignAgentFactory` to inherit the proven 10822-byte runtime.

3. **Do not use `cast estimate` for `configureFundAndStart`**. Ritual returns inflated values (~190M gas) for scheduled-call estimations. Use fixed `--gas-limit 3500000`.

4. **Do not skip the executor health check**. It is the difference between a 0.5 RIT investment becoming a listed agent vs. dust burning into nothing within 30 min.

5. **Do not reuse a wallet** that previously had a failed factory deploy. The harness from a prior salt is already funded and immutable; you can't withdraw. New deploy attempts should use a fresh burner wallet.

6. **Do not assume `hasPendingJobForSender = false` means the harness is fine**. It tracks the EOA sender, not the harness. The harness can still have pending Phase 2 callbacks blocking subsequent wakeUps.

---

## DEBUG LOOKUP TABLE

| Symptom | Likely cause | Fix |
|---|---|---|
| `DeploymentFailed() 0x30116425` | gas-limit < 2.5M | Use `--gas-limit 5000000` |
| `Sender has a pending async job` | prior P1 still awaiting P2 | Wait or use new wallet |
| `insufficient funds for gas * price + value` | EOA < 0.5 RIT + gas | Faucet |
| `0x71a63c44` revert on `scheduler.execute(...)` | permissionless caller blocked | Only system can execute; this is normal |
| Listing page shows "Monitored" but no txs | Querying detail page (always returns template) | Use `/api/agents/cache` |
| Harness only emits 1 event despite many scheduler ticks | Phase 2 not delivering → pending lock → all wakeUps revert | Wait for executor; nothing you can do |
| Escrow drops without harness emit | Scheduler charging for failed wakeUps | Same root cause; if escrow → 0 without listing, lost |

---

## OUTPUT FORMAT

After completion, report to user in this exact format:

```
═══ SOVEREIGN AGENT DEPLOY REPORT ═══
Owner:        <0x...>
Harness:      <0x...>
Salt:         <0x...>
Deploy tx:    <0x...>
Configure tx: <0x...>
CallId:       <decimal>
Listed:       YES | NO (timeout after Nmin)
Escrow:       <X.XX RIT>
Spent:        <X.XX RIT total>
Explorer:     https://explorer.ritualfoundation.org/agents?kind=sovereign  (search address)
═════════════════════════════════════
```

---

## ETHICS / SAFETY

- Never log or echo `PRIVATE_KEY`, `OPENAI_API_KEY`, or `HF_TOKEN` values. Print only "SET" / "MISSING" indicators.
- Warn user: 0.5 RIT commitment is irreversible. No withdraw function exists on the harness.
- Refuse to proceed if user's wallet ≠ their declared owner address.
- Do not deploy on behalf of a user who has a pending failed/locked harness — surface the prior state first.

---

## END OF MASTER PROMPT
