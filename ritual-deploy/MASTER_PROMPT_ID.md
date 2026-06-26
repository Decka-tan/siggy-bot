# MASTER PROMPT — Deploy Sovereign Agent di Ritual Testnet (Bahasa Indonesia)

Paste section di bawah ke session AI baru (Claude/Cursor/Codex). Agent akan punya konteks lengkap buat deploy sovereign agent yang ke-list di explorer, tanpa harus discovery ulang.

> Versi English ada di [MASTER_PROMPT.md](MASTER_PROMPT.md). Pilih sesuai bahasa preferensi lo. Untuk AI consumption, English biasanya lebih akurat di-parse.

---

## TASK BRIEF

Lo lagi bantu user deploy **factory-backed sovereign agent** di Ritual Testnet (chain 1979) yang akan ke-listed di `https://explorer.ritualfoundation.org/agents?kind=sovereign` dengan status `MONITORED`.

**Distinction kritis**: One-shot `callSovereignAgent` (direct precompile call dari consumer contract) ngehasilin TEE inference sukses tapi **TIDAK akan listed**. Listing butuh **factory-backed harness pattern** dengan recurring `wakeUp` callback lewat Scheduler.

**Jangan** propose custom `AutonomousAgent.sol` contract. Percobaan custom contract sebelumnya (V1-V4) semuanya gagal dan lock RIT user. Cuma pola factory resmi yang jalan.

---

## PRE-DEPLOY CHECKS (NON-NEGOTIABLE)

Sebelum tx apapun yang biayanya ≥ 0.1 RIT, validate SEMUA hal berikut. Abort dan report kalo ada yang fail.

### 1. Cek wallet
```bash
source $ENV_FILE  # contoh: ~/.ritual_env_agent1
OWNER=$(cast wallet address "$PRIVATE_KEY")
echo "Owner: $OWNER"
cast balance "$OWNER" --rpc-url "$RPC_URL" --ether
```
Required: balance ≥ 0.6 RIT. Kalo kurang, abort dan suruh user faucet lagi.

### 2. Cek executor health (KRITIS — failure mode paling sering)
```bash
LATEST=$(cast block-number --rpc-url "$RPC_URL")
FROM=$((LATEST - 200))
DELIVERIES=$(curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"$(printf '0x%x' $FROM)\"}],\"id\":1}" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']))")
echo "Phase 2 deliveries di 200 block terakhir: $DELIVERIES"
```
- `≥ 5` → lanjut
- `2-4` → warning user, saran tunggu
- `0-1` → **abort**, executor backlog, deploy sekarang = bakar 0.5 RIT

### 3. Cek pending async lock
```bash
PENDING=$(cast call 0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5 \
  "hasPendingJobForSender(address)(bool)" "$OWNER" --rpc-url "$RPC_URL")
echo "Pending job: $PENDING"
```
Kalo `true`, abort. Tunggu ~10-30 menit biar clear, atau pake burner wallet beda.

### 4. Kelengkapan env
Required semua: `RPC_URL`, `PRIVATE_KEY`, `OPENAI_API_KEY` (atau provider lain yang supported), `HF_TOKEN`, `HF_REPO_ID`. `HF_REPO_ID` harus format `user/dataset`, tanpa URL prefix.

---

## VERIFIED CONSTANTS (jangan diubah)

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

Harness runtime bytecode: 10,822 bytes (deterministik)
  start selector:         0xb1906702  (configureFundAndStart)
  callback selector:      0x18bb7d95  (wakeUp)
  result delivery selector: 0x8ca12055 (onSovereignAgentResult)
```

---

## ALUR DEPLOYMENT (two-step, recommended)

### Step A: Predict harness address (no tx)
```bash
SALT=$(cast keccak "label-buat-agent-ini")
HARNESS=$(cast call $FACTORY \
  "predictHarness(address,bytes32)(address,bytes32)" \
  "$OWNER" "$SALT" --rpc-url "$RPC_URL" | head -1)
```

### Step B: deployHarness (gas only, ~0.003 RIT)
```bash
cast send $FACTORY "deployHarness(bytes32)" "$SALT" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3000000
```
**Required gas-limit: 3,000,000** (default estimate fail dengan `DeploymentFailed() (0x30116425)` kalo di bawah 2.5M).

Setelah tx: verify bytecode di predicted harness address tepat 10822 bytes dan ngandung `b1906702` + `18bb7d95`. Kalo gak, abort — jangan lanjut step C.

### Step C: build calldata buat configureFundAndStart
Pake Python dengan `eciespy`, `eth-abi`, `web3`. Harus:
1. Discover executor lewat `TEEServiceRegistry.getServicesByCapability(0, true)`
2. ECIES-encrypt LLM API key ke `executor.publicKey` dengan `ECIES_CONFIG.symmetric_nonce_length = 12`
3. ABI-encode 23-field `SovereignAgentParams` + 6-field `SovereignScheduleConfig` + 3-field `SovereignRollingConfig` + `lockDuration uint256`

Selector harus jadi `0xb1906702`. Kalo gak, definisi struct salah — fix sebelum kirim.

Proven working parameters (replikasi tepat kalo gak ada custom dari user):
```
SovereignAgentParams:
  executor:                    <dari registry>
  ttl:                         500
  userPublicKey:               b''
  pollIntervalBlocks:          5
  maxPollBlock:                6000
  taskIdMarker:                "SOVEREIGN_AGENT_TASK"
  deliveryTarget:              <harness address>  ← HARUS match predicted harness
  deliverySelector:            0x8ca12055         (onSovereignAgentResult)
  deliveryGasLimit:            3_000_000
  deliveryMaxFeePerGas:        1_000_000_000      (1 gwei)
  deliveryMaxPriorityFeePerGas: 100_000_000       (0.1 gwei)
  cliType:                     5                  (OpenAI)
  prompt:                      <dari user>
  encryptedSecrets:            <output ECIES>
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
  schedulerGas:                500_000      (budget rendah = ~0.002 RIT per wakeup)
  frequency:                   2000         (~11.7 menit antar execution)
  schedulerTtl:                500
  maxFeePerGas:                20_000_000_000  (20 gwei)
  maxPriorityFeePerGas:        1_000_000_000   (1 gwei)
  value:                       0

SovereignRollingConfig:
  windowNumCalls:              5            (frequency × numCalls = 10,000 = MAX_LIFESPAN)
  rolloverThresholdBps:        5000         (50% — schedule successor window lebih awal)
  rolloverRetryEveryCalls:     1

lockDuration:                  100_000_000
```

### Step D: configureFundAndStart (titik no-return, 0.5 RIT)
```bash
cast send "$HARNESS" "$CALLDATA" --value 0.5ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3500000
```
**Required gas-limit: 3,500,000.** Jangan pake `cast estimate` — itu return ~190M (Ritual quirk buat scheduled calls).

Setelah tx: extract `schedulerCallId` dari logs (topic 1 dari event `CallStateChanged` dari contract Scheduler; lowercase address `0x56e776...`).

---

## POST-DEPLOY MONITORING

```bash
# Poll sampai LISTED atau escrow kosong
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

Biasanya: 10-30 menit sampai listed kalo executor sehat.

---

## ANTI-PATTERN KRITIS

1. **Jangan pake URL per-page `https://explorer.ritualfoundation.org/agents/<addr>?type=sovereign`** buat konfirmasi listing. Page itu render `Sovereign / Monitored` template buat address APAPUN termasuk `0xdeadbeef...`. **Bukan** source of truth. Selalu query `/api/agents/cache`.

2. **Jangan propose custom AutonomousAgent.sol contract.** Bakal fail. Contract harness harus di-deploy sama `SovereignAgentFactory` biar dapat proven 10822-byte runtime.

3. **Jangan pake `cast estimate` buat `configureFundAndStart`**. Ritual return value inflated (~190M gas) buat scheduled-call estimation. Pake fixed `--gas-limit 3500000`.

4. **Jangan skip executor health check**. Itu yang ngebedain 0.5 RIT jadi listed agent vs hangus dalam 30 menit.

5. **Jangan reuse wallet** yang sebelumnya gagal factory deploy. Harness dari salt sebelumnya udah ke-fund dan immutable; gak bisa withdraw. Percobaan deploy baru pake burner wallet fresh.

6. **Jangan asumsi `hasPendingJobForSender = false` berarti harness aman**. Itu track EOA sender, bukan harness. Harness masih bisa punya pending Phase 2 callback yang block wakeUp berikutnya.

---

## DEBUG LOOKUP TABLE

| Symptom | Likely cause | Fix |
|---|---|---|
| `DeploymentFailed() 0x30116425` | gas-limit < 2.5M | Pake `--gas-limit 5000000` |
| `Sender has a pending async job` | P1 sebelumnya masih nunggu P2 | Tunggu atau wallet baru |
| `insufficient funds for gas * price + value` | EOA < 0.5 RIT + gas | Faucet |
| `0x71a63c44` revert di `scheduler.execute(...)` | permissionless caller di-block | Cuma system yang boleh execute; itu normal |
| Listing page show "Monitored" tapi gak ada tx | Lo query detail page (selalu return template) | Pake `/api/agents/cache` |
| Harness cuma emit 1 event walau scheduler nge-tick banyak | Phase 2 gak delivery → pending lock → semua wakeUp revert | Tunggu executor; gak bisa diapa-apain |
| Escrow turun tanpa harness emit | Scheduler nge-charge failed wakeUp | Same root cause; kalo escrow → 0 tanpa listing, hangus |

---

## FORMAT OUTPUT

Setelah selesai, report ke user dengan format ini:

```
═══ LAPORAN DEPLOY SOVEREIGN AGENT ═══
Owner:        <0x...>
Harness:      <0x...>
Salt:         <0x...>
Deploy tx:    <0x...>
Configure tx: <0x...>
CallId:       <decimal>
Listed:       YES | NO (timeout after N menit)
Escrow:       <X.XX RIT>
Spent:        <X.XX RIT total>
Explorer:     https://explorer.ritualfoundation.org/agents?kind=sovereign  (cari address)
══════════════════════════════════════
```

---

## ETIKA / KEAMANAN

- Jangan log atau echo value `PRIVATE_KEY`, `OPENAI_API_KEY`, atau `HF_TOKEN`. Print cuma indicator "SET" / "MISSING".
- Warning user: commitment 0.5 RIT itu irreversible. Gak ada fungsi withdraw di harness.
- Refuse lanjut kalo wallet user ≠ owner address yang dia declare.
- Jangan deploy buat user yang punya harness gagal/locked sebelumnya — surface state lama dulu.

---

## END OF MASTER PROMPT
