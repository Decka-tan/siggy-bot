# Deploy a Sovereign Agent on Ritual Testnet — Baby Mode Guide
# Deploy Sovereign Agent di Ritual Testnet — Mode Bayi

**Goal / Tujuan**: Get your agent listed at https://explorer.ritualfoundation.org/agents?kind=sovereign with `MONITORED` status — not just a one-shot inference call.

This tutorial uses the **factory-backed harness pattern** (the one that actually lists), not the one-shot `sovereign-agent` example pattern (which produces a successful inference but **never appears in the agents page**).

> Tutorial ini pake pola **factory-backed harness** (yang beneran masuk listing), bukan pola one-shot `sovereign-agent` example (yang inference-nya sukses tapi agennya **gak pernah muncul** di halaman agents).

---

## 0. Reality check / Cek realita

| Item | Required |
|---|---|
| Native RITUAL token | **≥ 0.6 RIT** (0.5 for funding, 0.06 for gas, 0.04 buffer) |
| OS | Windows 10/11 with WSL2 Ubuntu, or native Linux/macOS |
| Wallet | MetaMask with burner address (don't use your main wallet) |
| LLM provider | OpenAI / Anthropic / Gemini / OpenRouter account + API key |
| HuggingFace | account + token (write) + 1 empty dataset |
| Time | ~30 min if executor healthy, ~hours if backlogged |
| Risk | If executor backlogged when you deploy, **0.5 RIT can be lost** with no recovery |

**EN**: There is **no withdraw/cancel function** on the harness. Once you commit 0.5 RIT to it, you can't pull it back. If Phase 2 callback never delivers (executor backlog), the scheduler keeps charging fees until escrow is empty. Pre-deploy executor health check is mandatory.

**ID**: Harness contract **tidak punya fungsi withdraw/cancel**. Begitu lo masukin 0.5 RIT, gak bisa ditarik lagi. Kalau Phase 2 callback gak deliver (executor backlog), scheduler tetep nge-charge fee sampai escrow kosong. Cek kesehatan executor sebelum deploy itu wajib.

---

## 1. Install WSL Ubuntu (Windows only) / Install WSL Ubuntu (Windows aja)

Skip if you're on Linux/macOS. / Skip kalo lo udah di Linux/macOS.

Open PowerShell **as Administrator**, run:

```powershell
wsl --install -d Ubuntu
```

Reboot if asked. After reboot, open Ubuntu from Start menu. Set a Linux username + password (the password field shows nothing while you type — that's normal).

> Buka PowerShell **as Administrator**, lalu jalanin `wsl --install -d Ubuntu`. Reboot kalo diminta. Buka Ubuntu dari Start menu, set username + password Linux. (Pas ketik password, gak ada karakter yang muncul — itu normal.)

---

## 2. Install base packages

In Ubuntu terminal:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3 python3-pip unzip pkg-config libssl-dev bc
```

---

## 3. Install Foundry (forge + cast)

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
export PATH="$HOME/.foundry/bin:$PATH"
foundryup

# Verify
forge --version
cast --version
```

If `cast: command not found`, add to PATH manually:

```bash
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## 4. Install uv (Python package runner) / Install uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

---

## 5. Get RITUAL faucet / Ambil RIT dari faucet

1. Open https://faucet.ritualfoundation.org
2. Connect wallet (use a **burner wallet** — not your main one)
3. Request RIT. You need **≥ 0.6 RIT** total.
4. Wait for confirmation in your wallet (chain ID 1979).

**EN**: If faucet rate-limited, ask in Ritual Discord `#testnet-faucet` channel. Don't reuse the same wallet for multiple deploys — if a deploy fails, the locked balance is unrecoverable per wallet.

**ID**: Kalau faucet rate-limit, minta di Discord Ritual `#testnet-faucet`. Jangan pake wallet sama buat deploy berkali-kali — kalo gagal, RIT yang ke-lock gak bisa diambil per-wallet.

---

## 6. Get OpenAI API key / Ambil OpenAI key

1. https://platform.openai.com/api-keys → Create new key
2. Copy (starts with `sk-...` or `sk-proj-...`)
3. **Add at least $5 credit** to the account. The key is sealed to a TEE executor, but no credit = no inference.

**EN**: Cheaper alternative: get OpenRouter free model. Set `OPENROUTER_API_KEY` and use a free model like `meta-llama/llama-3.1-8b-instruct:free`. Modify the script's `cliType` accordingly (5 = OpenAI, check helpers.py for others).

**ID**: Alternatif murah: pake OpenRouter free model. Set `OPENROUTER_API_KEY` dan model `meta-llama/llama-3.1-8b-instruct:free`. Modifikasi `cliType` di script (5 = OpenAI, cek helpers.py untuk yang lain).

---

## 7. Get HuggingFace token + dataset / HF token + dataset

1. https://huggingface.co/join (skip if you have an account)
2. https://huggingface.co/settings/tokens → "New token" → type **Write** → copy (`hf_...`)
3. https://huggingface.co/new-dataset → 
   - Owner: your HF username
   - Dataset name: `ritual-sovereign-agent` (any name OK)
   - Visibility: **Private** (recommended) or Public
   - **Do not** initialize with any files
4. Note your `HF_REPO_ID` in format `username/dataset-name`. **No URL, no prefix.**

Wrong / Salah:
```
HF_REPO_ID=https://huggingface.co/datasets/decka-tan/ritual-sovereign-agent
HF_REPO_ID=hf_xyz123
```

Correct / Benar:
```
HF_REPO_ID=decka-tan/ritual-sovereign-agent
```

---

## 8. Create env file / Bikin env file

```bash
nano ~/.ritual_env_agent1
```

Paste this (replace placeholders):

```bash
export RPC_URL="https://rpc.ritualfoundation.org"
export PRIVATE_KEY="0xYOUR_BURNER_WALLET_PRIVATE_KEY"
export OPENAI_API_KEY="sk-YOUR_OPENAI_KEY"
export MODEL="gpt-4o-mini"
export HF_TOKEN="hf_YOUR_HF_TOKEN"
export HF_REPO_ID="your-username/ritual-sovereign-agent"
```

Save: `Ctrl+O` → Enter → `Ctrl+X`.

Secure it / Amankan:
```bash
chmod 600 ~/.ritual_env_agent1
```

Verify / Verifikasi:
```bash
source ~/.ritual_env_agent1
echo "Wallet: $(cast wallet address "$PRIVATE_KEY")"
echo "Balance: $(cast balance $(cast wallet address "$PRIVATE_KEY") --rpc-url "$RPC_URL" --ether) RIT"
```

If balance < 0.6 RIT, **don't continue** — get more from faucet first.

> Kalau balance < 0.6 RIT, **jangan lanjut** — faucet lagi dulu.

---

## 9. CRITICAL: Executor health check / WAJIB: Cek executor

This is the step most people skip, and why they lose their funds.

**EN**: The Ritual executor processes Phase 2 callbacks asynchronously. If it's backlogged, your deployed harness can't complete its loop, the scheduler keeps charging fees, and your 0.5 RIT drains without ever getting listed. **Always check executor health first.**

**ID**: Step ini yang sering di-skip, makanya banyak orang kehilangan dana. Executor Ritual proses Phase 2 callback secara async. Kalau lagi backlog, harness lo gak bisa loop, scheduler tetep charge fee, dan 0.5 RIT lo abis tanpa listed. **Selalu cek executor dulu.**

```bash
source ~/.ritual_env_agent1
LATEST=$(cast block-number --rpc-url "$RPC_URL")
FROM=$((LATEST - 200))
DELIVERIES=$(curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"$(printf '0x%x' $FROM)\"}],\"id\":1}" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']))")
echo "Phase 2 deliveries in last 200 blocks (~70s): $DELIVERIES"
```

Interpret:
- `≥ 5` → ✅ healthy, proceed
- `2-4` → ⚠️ slow, deploy at your own risk
- `0-1` → ❌ backlogged, **wait 30 min and re-check**

> Interpretasi:
> - `≥ 5` → ✅ sehat, lanjut
> - `2-4` → ⚠️ lemot, risiko sendiri
> - `0-1` → ❌ backlog, **tunggu 30 menit cek lagi**

---

## 10. Deploy harness via factory / Deploy harness lewat factory

This deploys the harness contract via SovereignAgentFactory CREATE2 (deterministic address).

> Ini deploy contract harness lewat SovereignAgentFactory CREATE2 (address-nya deterministik).

```bash
source ~/.ritual_env_agent1
OWNER=$(cast wallet address "$PRIVATE_KEY")
FACTORY=0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304
SALT_LABEL="my-agent-$(date +%s)"
SALT=$(cast keccak "$SALT_LABEL")

# Predict the address (deterministic from owner + salt)
HARNESS=$(cast call $FACTORY "predictHarness(address,bytes32)(address,bytes32)" "$OWNER" "$SALT" --rpc-url "$RPC_URL" | head -1)
echo "Salt label: $SALT_LABEL"
echo "Salt hash:  $SALT"
echo "Predicted harness: $HARNESS"
echo ""

# Deploy (gas-limit must be 3M+, default estimate underbids)
cast send $FACTORY "deployHarness(bytes32)" "$SALT" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3000000
```

If status `1 (success)`:

```bash
# Verify bytecode matches the template (10,822 bytes)
SIZE=$(cast code "$HARNESS" --rpc-url "$RPC_URL" | wc -c)
echo "Bytecode chars: $SIZE (expected 21647 for 10822 bytes)"
cast code "$HARNESS" --rpc-url "$RPC_URL" | grep -c "18bb7d95" && echo "callback OK"
cast code "$HARNESS" --rpc-url "$RPC_URL" | grep -c "b1906702" && echo "start OK"
```

**EN**: If `DeploymentFailed()` revert, gas was too low. Retry with `--gas-limit 5000000`.

**ID**: Kalo revert `DeploymentFailed()`, gas-nya kekecilan. Coba lagi dengan `--gas-limit 5000000`.

---

## 11. Build calldata + configure / Build calldata + configure

This builds the 23-field `SovereignAgentParams` struct, encrypts your OpenAI key for the TEE executor, and sends `configureFundAndStart` with 0.5 RIT.

> Ini build struct `SovereignAgentParams` (23 field), encrypt OpenAI key buat TEE executor, lalu kirim `configureFundAndStart` dengan 0.5 RIT.

Save this Python helper as `~/build_calldata.py`:

```python
#!/usr/bin/env python3
"""Build configureFundAndStart calldata. Reads HARNESS env."""
import os, json, sys
from ecies import encrypt as ecies_encrypt
from ecies.config import ECIES_CONFIG
from eth_abi.abi import encode as abi_encode
from web3 import Web3

ECIES_CONFIG.symmetric_nonce_length = 12

RPC      = os.environ['RPC_URL']
REGISTRY = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F'
HARNESS  = os.environ['HARNESS']
HF_REPO  = os.environ['HF_REPO_ID']
PROMPT   = os.environ.get('PROMPT', "You are a sovereign Ritual agent. Analyze one trend at the intersection of AI and crypto, suggest one practical product idea, return a short confirmation.")

w3 = Web3(Web3.HTTPProvider(RPC))
REG_ABI = [{"name":"getServicesByCapability","type":"function","stateMutability":"view",
 "inputs":[{"name":"c","type":"uint8"},{"name":"v","type":"bool"}],
 "outputs":[{"name":"","type":"tuple[]","components":[
   {"name":"node","type":"tuple","components":[
     {"name":"a","type":"address"},{"name":"b","type":"address"},{"name":"c","type":"uint8"},
     {"name":"d","type":"bytes"},{"name":"e","type":"string"},{"name":"f","type":"bytes32"},{"name":"g","type":"uint8"}]},
   {"name":"v","type":"bool"},{"name":"w","type":"bytes32"}]}]}]
reg = w3.eth.contract(address=REGISTRY, abi=REG_ABI)
services = reg.functions.getServicesByCapability(0, True).call()
EXECUTOR = w3.to_checksum_address(services[0][0][1])
pubkey = bytes(services[0][0][3])
print(f"Executor: {EXECUTOR}", file=sys.stderr)

enc_secrets = ecies_encrypt(pubkey, json.dumps({"OPENAI_API_KEY": os.environ['OPENAI_API_KEY']}).encode())

params = (
    EXECUTOR, 500, b'', 5, 6000, 'SOVEREIGN_AGENT_TASK',
    HARNESS, bytes.fromhex('8ca12055'),
    3_000_000, 1_000_000_000, 100_000_000, 5,
    PROMPT, enc_secrets,
    ('hf', f'{HF_REPO}/sessions/session-001.jsonl', 'HF_TOKEN'),
    ('hf', f'{HF_REPO}/artifacts/', 'HF_TOKEN'),
    [],
    ('hf', f'{HF_REPO}/prompts/default-system.md', ''),
    'gpt-4o-mini', [], 50, 8192, '',
)
schedule = (1_800_000, 180, 500, 20_000_000_000, 1_000_000_000, 0)
rolling  = (30, 5000, 1)
LOCK_DURATION = 100_000_000

PARAMS_T = "(address,uint256,bytes,uint64,uint64,string,address,bytes4,uint256,uint256,uint256,uint16,string,bytes,(string,string,string),(string,string,string),(string,string,string)[],(string,string,string),string,string[],uint16,uint32,string)"
SCHED_T  = "(uint32,uint32,uint32,uint256,uint256,uint256)"
ROLL_T   = "(uint32,uint16,uint16)"

sig = f"configureFundAndStart({PARAMS_T},{SCHED_T},{ROLL_T},uint256)"
selector = Web3.keccak(text=sig)[:4]
assert selector.hex() == 'b1906702', f"selector mismatch: {selector.hex()}"
args = abi_encode([PARAMS_T, SCHED_T, ROLL_T, "uint256"], [params, schedule, rolling, LOCK_DURATION])
print('0x' + selector.hex() + args.hex())
```

Run it:

```bash
# Set HARNESS from previous step's output
export HARNESS=0x...  # your predicted address from step 10
CALLDATA=$(uv run --with eciespy --with eth-abi --with web3 python ~/build_calldata.py)
echo "Calldata length: $(( (${#CALLDATA} - 2) / 2 )) bytes"
```

Send (this is the **point of no return** — 0.5 RIT will be transferred to harness escrow):

```bash
cast send "$HARNESS" "$CALLDATA" --value 0.5ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3500000
```

If status `1 (success)`, scheduler is now armed.

---

## 12. Monitor / Pantau

Save as `~/monitor.sh`:

```bash
#!/usr/bin/env bash
source ~/.ritual_env_agent1
HARNESS=${1:?usage: monitor.sh <harness_address>}

while true; do
  LISTED=$(curl -s https://explorer.ritualfoundation.org/api/agents/cache \
    | python3 -c "import json,sys; d=json.load(sys.stdin); t='${HARNESS,,}'; print('YES' if any(x['address'].lower()==t for x in d.get('sovereign',[])) else 'NO')")
  ESCROW=$(cast call 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948 "balanceOf(address)(uint256)" "$HARNESS" --rpc-url "$RPC_URL" | head -1)
  ESCROW_RIT=$(python3 -c "print($ESCROW/1e18)")
  echo "[$(date +%H:%M:%S)] escrow=$ESCROW_RIT RIT  listed=$LISTED"
  [ "$LISTED" = "YES" ] && { echo "🎉 LISTED!"; exit 0; }
  [ "$ESCROW" = "0" ] && { echo "💀 Escrow empty"; exit 1; }
  sleep 60
done
```

```bash
chmod +x ~/monitor.sh
bash ~/monitor.sh $HARNESS
```

Wait until you see `🎉 LISTED!` or `💀 Escrow empty`. Typical wait: 10–30 minutes when executor is healthy.

> Tunggu sampai keluar `🎉 LISTED!` atau `💀 Escrow empty`. Biasa nunggu 10-30 menit kalo executor sehat.

---

## 13. Verify on explorer / Verifikasi di explorer

Once listed, visit:

- Agent page: `https://explorer.ritualfoundation.org/agents/<HARNESS>?type=sovereign`
- Or scroll the list: `https://explorer.ritualfoundation.org/agents?kind=sovereign`

You should see:
- ✅ Status: `Sovereign / Monitored`
- ✅ Last Heartbeat: a recent block number (not `—`)
- ✅ Transactions: recurring `execute()` from `0x0000...fa7e` (the system executor)

> Yang harus muncul:
> - ✅ Status: `Sovereign / Monitored`
> - ✅ Last Heartbeat: block number recent (bukan `—`)
> - ✅ Transactions: `execute()` recurring dari `0x0000...fa7e` (system executor)

---

## 14. About internal reverts / Soal revert internal

When you click on a scheduled `execute()` tx → Internal Transactions tab, you'll see **3-5 "execution reverted"** entries. **This is normal.** Every listed sovereign agent has this pattern.

> Pas lo klik tx scheduled `execute()` → tab Internal Transactions, bakal keliatan **3-5 "execution reverted"**. **Itu normal.** Semua sovereign agent yang listed juga begitu.

The harness has rolling-window try/catch logic. On each `wakeUp`:
1. Try to promote pending successor window → reverts if none exists
2. Try to cancel previous window's retired call → reverts if none
3. The actual sovereign precompile call happens **last** at `harness → 0x0000...080c`

> Harness pake try/catch logic untuk rolling window. Tiap `wakeUp`:
> 1. Coba promote successor window → revert kalo gak ada
> 2. Coba cancel previous window → revert kalo gak ada
> 3. Call sovereign precompile beneran terjadi **terakhir** di `harness → 0x0000...080c`

You can't eliminate these reverts — harness contract is immutable.

> Revert ini gak bisa dihapus — contract harness immutable.

---

## 15. Cost ledger / Catatan biaya

| Item | RIT |
|---|---|
| Faucet input | 1.0 (typical) |
| `deployHarness` gas | 0.0023 |
| `configureFundAndStart` gas | 0.003 |
| `configureFundAndStart` value (locked) | 0.500 |
| Buffer kept in EOA | 0.05 |
| **Total committed** | **~0.555** |
| Returned via gas refunds (over time) | up to ~0.1 |

Escrow remains locked even after listing (covers ongoing scheduled executions). No withdraw possible.

> Escrow tetep ke-lock walau udah listed (buat bayar scheduled executions terus). Gak ada withdraw.

---

## 16. Common errors / Error umum

### `DeploymentFailed() (0x30116425)`
**Cause**: gas limit too low for CREATE2 deploy.  
**Fix**: increase `--gas-limit` to 5000000.  
**ID**: gas kurang untuk CREATE2. Naikin `--gas-limit` ke 5000000.

### `ERROR: Sender has a pending async job`
**Cause**: previous sovereign call's Phase 2 hasn't delivered yet.  
**Fix**: wait 10-30 minutes for executor to clear pending jobs, or use a different burner wallet.  
**ID**: Phase 2 dari call sebelumnya belum delivery. Tunggu 10-30 menit atau pake burner wallet lain.

### `insufficient funds for gas * price + value`
**Cause**: native RIT balance < 0.5 + gas.  
**Fix**: hit faucet again.  
**ID**: balance native RIT < 0.5 + gas. Faucet lagi.

### Phase 2 timeout, no callback delivered
**Cause**: Ritual executor backlogged.  
**Fix**: stop deploying, wait until step 9's deliveries-in-200-blocks count is ≥ 5.  
**ID**: Executor Ritual lagi backlog. Stop deploy, tunggu sampai jumlah delivery di step 9 ≥ 5.

### Agent listed but `Last Heartbeat: —` and no txs in Transactions tab
**Cause**: explorer indexer lag, OR you're viewing the page for an address that's actually empty.  
**Fix**: check `api/agents/cache` directly:
```bash
curl -s https://explorer.ritualfoundation.org/api/agents/cache \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([x for x in d['sovereign'] if x['address'].lower()=='YOUR_HARNESS_LOWERCASE'])"
```
If empty list, not actually listed. The agent detail page returns a default "Monitored" template for any address.  
**ID**: Indexer explorer lag, ATAU lo lagi view page address yang sebenernya kosong. Cek `api/agents/cache` langsung. Kalau list kosong, belum listed beneran. Page detail return template "Monitored" buat any address.

---

## 17. Wallet rotation strategy / Strategi rotasi wallet

Don't reuse a wallet that previously had a failed factory deploy. The harness from that wallet is permanently funded and the salt is consumed. Use a fresh burner wallet for each new deploy attempt.

> Jangan pake wallet yang sebelumnya gagal factory deploy. Harness dari wallet itu udah ke-fund permanen + salt udah ke-consume. Pake burner wallet baru tiap retry.

---

## 18. Genesis claim (optional) / Klaim Genesis (opsional)

After your agent is listed, you may be eligible for Ritual Genesis 1000:
1. Join Ritual Discord: https://discord.gg/ritual
2. Run command: `/genesis_claim`
3. Provide a 1-line agent description, e.g.: *"A sovereign Ritual agent that analyzes AI x crypto trends."*

Eligibility is determined by Ritual's own rules. This tutorial only covers the technical deploy.

> Setelah agent listed, lo mungkin eligible buat Genesis 1000. Join Discord Ritual, run `/genesis_claim`, kasih deskripsi 1 baris. Eligibility ditentukan Ritual sendiri.

---

## Reference / Referensi

- Factory contract: `0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304`
- Scheduler: `0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B`
- RitualWallet: `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948`
- AsyncDelivery: `0x5A16214fF555848411544b005f7Ac063742f39F6`
- TEEServiceRegistry: `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F`
- Sovereign Agent precompile: `0x000000000000000000000000000000000000080C`
- Ritual docs: https://docs.ritualfoundation.org/
- Skills repo: https://github.com/ritual-foundation/ritual-dapp-skills
- Explorer: https://explorer.ritualfoundation.org/

## Credits

Pattern verified against working listed agent `0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537` on 2026-06-25. Factory ABI from `ritual-foundation/ritual-dapp-skills/skills/ritual-dapp-agents/SKILL.md`.

> Pattern udah ke-verify dari listed agent `0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537` pada 2026-06-25.
