# Sovereign Agent Factory Deploy — Proof & Knowledge Capture

Session: 2026-06-25  
Owner wallet: `0x35292cb972eF6233E5d7651Ef7adBe0C1b2E5CCd`

## Pattern unlocked

Codex's V1–V4 failed because they tried custom `AutonomousAgent.sol`. The actual working pattern uses Ritual's **SovereignAgentFactory**, not custom contracts.

```
Factory:  0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304
Pattern:  factory.deployHarness(salt) → harness.configureFundAndStart{value}(...)
Selectors verified working:
  - configureFundAndStart: 0xb1906702
  - wakeUp callback:        0x18bb7d95
Bytecode: 10,822 bytes (deterministic via CREATE2)
Source:   github.com/ritual-foundation/ritual-dapp-skills (SKILL.md)
```

## V5 deployment record

```
Salt:     0xa74c471c22e4f4466d1d078b9a15171993e95e2a8463e4f0f04375fd8d74c10b
Harness:  0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537

Deploy tx:    0x8f23d29a7aa5176f443b0e17a638ae8e33b55004799302c82faea749894ece0e
              block 37,408,235 — deployHarness() succeeded
              gas: 2,319,273

Start tx:     0x8705fa7b077bf1d2654a90e6a4fcf3a9e89eb2056ec2e171b59ce098602732f1
              block 37,408,235+ — configureFundAndStart{0.5 RIT}
              gas: 3,269,155
              schedulerCallId: 2,742,077 (0x29d73d)

Schedule config:
  numCalls:           30
  frequency:          180 blocks (~60s)
  schedulerTtl:       500
  schedulerGas:       1,800,000
  maxFeePerGas:       20 gwei
  maxPriorityFee:     1 gwei
  windowNumCalls:     30
  rolloverThresholdBps: 5000
  rolloverRetry:      1
  lockDuration:       100,000,000 blocks
```

## V5 outcome

Schedule fired correctly at 180-block intervals. First wakeUp emitted event at block 37,410,935. **Phase 2 callback never delivered** (Ritual executor backlog). Subsequent wakeUps reverted (pending async job lock). Escrow drained at ~0.01 RIT/tick.

**Lesson**: Deploy timing matters. If Ritual executor is backlogged (visible via Phase 2 timeout on sovereign-agent example), avoid factory deploy. Schedule will burn through escrow without producing wakeUp events that qualify for `MONITORED` status.

## Pre-deploy executor health check

Before re-deploying with a new faucet, verify executor is healthy:

```bash
LATEST=$(cast block-number --rpc-url https://rpc.ritualfoundation.org)
FROM=$((LATEST - 200))
curl -s -X POST https://rpc.ritualfoundation.org -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"$(printf '0x%x' $FROM)\"}],\"id\":1}" \
  | python3 -c "import json,sys; print('deliveries in last 200 blocks:', len(json.load(sys.stdin)['result']))"
```

Need **≥5 deliveries** in 200 blocks (~70s) before deploying. If <3, executor is backlogged — wait.

## Files

- `deploy-sovereign-harness.sh` — main deploy script with executor health gate
- `build_calldata.py` — builds 23-field SovereignAgentParams + encrypts OPENAI key via ECIES
- `monitor.sh` — post-deploy watcher (escrow, Phase 2, listing)

## Cost ledger

| Tx | RIT |
|---|---|
| deployHarness | ~0.0023 |
| configureFundAndStart (value) | 0.5 |
| configureFundAndStart (gas) | ~0.003 |
| **Initial cost** | **~0.505** |
| Escrow burn until listed/dead | up to 0.5 |
| **Worst case loss** | **0.5 RIT** |
| Best case | 0.5 RIT → listed sovereign agent |

## Required env (`~/.ritual_env_agent1`)

```bash
export RPC_URL="https://rpc.ritualfoundation.org"
export PRIVATE_KEY="0x..."
export OPENAI_API_KEY="sk-..."
export HF_TOKEN="hf_..."
export HF_REPO_ID="username/dataset-name"
```
