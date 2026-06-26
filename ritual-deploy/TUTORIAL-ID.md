# Deploy Sovereign Agent di Ritual Testnet — Mode Bayi

**Tujuan**: Bikin agent lo ke-listed di https://explorer.ritualfoundation.org/agents?kind=sovereign dengan status `MONITORED` — bukan cuma one-shot inference call.

Tutorial ini pake pola **factory-backed harness** (yang beneran masuk listing), bukan pola one-shot `sovereign-agent` example (yang inference-nya sukses tapi agennya **gak pernah muncul** di halaman agents).

---

## 0. Cek realita dulu

| Item | Yang dibutuhin |
|---|---|
| Native RITUAL token | **≥ 0.6 RIT** (0.5 buat funding, 0.06 gas, 0.04 buffer) |
| OS | Windows 10/11 + WSL2 Ubuntu, atau Linux/macOS native |
| Wallet | MetaMask burner address (**jangan pake wallet utama**) |
| LLM provider | Akun + API key OpenAI / Anthropic / Gemini / OpenRouter |
| HuggingFace | Akun + token (write) + 1 dataset kosong |
| Waktu | ~30 menit kalo executor sehat, bisa jam-jaman kalo backlog |
| Risiko | Kalo executor backlog pas lo deploy, **0.5 RIT bisa hilang** tanpa recovery |

Harness contract **gak punya fungsi withdraw/cancel**. Begitu lo masukin 0.5 RIT, gak bisa ditarik lagi. Kalau Phase 2 callback gak deliver (executor backlog), scheduler tetep nge-charge fee sampai escrow kosong. **Cek kesehatan executor sebelum deploy itu wajib.**

---

## 1. Install WSL Ubuntu (Windows aja)

Skip kalo lo udah di Linux/macOS.

Buka PowerShell **as Administrator**, jalanin:

```powershell
wsl --install -d Ubuntu
```

Reboot kalo diminta. Buka Ubuntu dari Start menu, set username + password Linux. (Pas ketik password, gak ada karakter yang muncul — itu normal.)

---

## 2. Install base packages

Di terminal Ubuntu:

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

forge --version
cast --version
```

Kalo `cast: command not found`:

```bash
echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## 4. Install uv (Python package runner)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

---

## 5. Ambil RIT dari faucet

1. Buka https://faucet.ritualfoundation.org
2. Connect wallet (pake **burner wallet** — bukan wallet utama)
3. Request RIT. Lo butuh **≥ 0.6 RIT** total.
4. Tunggu konfirmasi di wallet (chain ID 1979).

Kalo faucet rate-limit, minta di Discord Ritual channel `#testnet-faucet`. **Jangan pake wallet sama buat deploy berkali-kali** — kalo gagal, RIT yang ke-lock gak bisa diambil per-wallet.

---

## 6. Ambil OpenAI API key

1. https://platform.openai.com/api-keys → Create new key
2. Copy (mulai `sk-...` atau `sk-proj-...`)
3. Top-up minimal $5 credit ke akun. Key di-seal ke TEE executor, tapi tanpa credit = gak ada inference.

Alternatif murah: pake OpenRouter free model. Set `OPENROUTER_API_KEY` dan model `meta-llama/llama-3.1-8b-instruct:free`. Modifikasi `cliType` di script (5 = OpenAI, cek helpers.py untuk yang lain).

---

## 7. Ambil HuggingFace token + dataset

1. https://huggingface.co/join (skip kalo udah punya akun)
2. https://huggingface.co/settings/tokens → "New token" → type **Write** → copy (`hf_...`)
3. https://huggingface.co/new-dataset →
   - Owner: username HF lo
   - Dataset name: `ritual-sovereign-agent` (nama bebas)
   - Visibility: **Private** (saran) atau Public
   - **Jangan** initialize dengan file apapun
4. Catet `HF_REPO_ID` lo format `username/dataset-name`. **Tanpa URL, tanpa prefix.**

Salah:
```
HF_REPO_ID=https://huggingface.co/datasets/decka-tan/ritual-sovereign-agent
HF_REPO_ID=hf_xyz123
```

Benar:
```
HF_REPO_ID=decka-tan/ritual-sovereign-agent
```

---

## 8. Bikin env file

```bash
nano ~/.ritual_env_agent1
```

Paste ini (ganti placeholder):

```bash
export RPC_URL="https://rpc.ritualfoundation.org"
export PRIVATE_KEY="0xPRIVATE_KEY_BURNER_WALLET_LO"
export OPENAI_API_KEY="sk-OPENAI_KEY_LO"
export MODEL="gpt-4o-mini"
export HF_TOKEN="hf_HF_TOKEN_LO"
export HF_REPO_ID="username-lo/ritual-sovereign-agent"
```

Save: `Ctrl+O` → Enter → `Ctrl+X`.

Amankan:
```bash
chmod 600 ~/.ritual_env_agent1
```

Verifikasi:
```bash
source ~/.ritual_env_agent1
echo "Wallet: $(cast wallet address "$PRIVATE_KEY")"
echo "Balance: $(cast balance $(cast wallet address "$PRIVATE_KEY") --rpc-url "$RPC_URL" --ether) RIT"
```

Kalo balance < 0.6 RIT, **jangan lanjut** — faucet lagi dulu.

---

## 9. WAJIB: Cek kesehatan executor

Step ini yang paling sering di-skip orang, makanya banyak yang kehilangan dana.

Executor Ritual proses Phase 2 callback secara async. Kalau lagi backlog, harness lo gak bisa loop, scheduler tetep charge fee, dan 0.5 RIT lo abis tanpa listed. **Selalu cek executor dulu.**

```bash
source ~/.ritual_env_agent1
LATEST=$(cast block-number --rpc-url "$RPC_URL")
FROM=$((LATEST - 200))
DELIVERIES=$(curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"$(printf '0x%x' $FROM)\"}],\"id\":1}" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']))")
echo "Phase 2 deliveries di 200 block terakhir (~70s): $DELIVERIES"
```

Interpretasi:
- `≥ 5` → sehat, lanjut
- `2-4` → lemot, risiko sendiri
- `0-1` → backlog, **tunggu 30 menit baru cek lagi**

---

## 10. Deploy harness lewat factory

Ini deploy contract harness lewat SovereignAgentFactory CREATE2 (address-nya deterministik).

```bash
source ~/.ritual_env_agent1
OWNER=$(cast wallet address "$PRIVATE_KEY")
FACTORY=0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304
SALT_LABEL="agent-gw-$(date +%s)"
SALT=$(cast keccak "$SALT_LABEL")

HARNESS=$(cast call $FACTORY "predictHarness(address,bytes32)(address,bytes32)" "$OWNER" "$SALT" --rpc-url "$RPC_URL" | head -1)
echo "Salt label: $SALT_LABEL"
echo "Salt hash:  $SALT"
echo "Predicted harness: $HARNESS"

cast send $FACTORY "deployHarness(bytes32)" "$SALT" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3000000
```

Kalo status `1 (success)`:

```bash
SIZE=$(cast code "$HARNESS" --rpc-url "$RPC_URL" | wc -c)
echo "Bytecode chars: $SIZE (expected 21647 buat 10822 bytes)"
cast code "$HARNESS" --rpc-url "$RPC_URL" | grep -c "18bb7d95" && echo "callback OK"
cast code "$HARNESS" --rpc-url "$RPC_URL" | grep -c "b1906702" && echo "start OK"
```

Kalo revert `DeploymentFailed()`, gas-nya kekecilan. Coba lagi dengan `--gas-limit 5000000`.

---

## 11. Build calldata + configure

Ini build struct `SovereignAgentParams` (23 field), encrypt OpenAI key buat TEE executor, lalu kirim `configureFundAndStart` dengan 0.5 RIT.

Save Python helper ini di `~/build_calldata.py`:

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
schedule = (500_000, 2000, 500, 20_000_000_000, 1_000_000_000, 0)
rolling  = (5, 5000, 1)  # windowNumCalls=5, threshold=50%, retry=1
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

Jalanin:

```bash
export HARNESS=0x...  # predicted address dari step 10
CALLDATA=$(uv run --with eciespy --with eth-abi --with web3 python ~/build_calldata.py)
echo "Calldata length: $(( (${#CALLDATA} - 2) / 2 )) bytes"
```

Kirim (ini **titik no-return** — 0.5 RIT pindah ke harness escrow):

```bash
cast send "$HARNESS" "$CALLDATA" --value 0.5ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3500000
```

Kalo status `1 (success)`, scheduler udah armed.

---

## 12. Monitor

Save di `~/monitor.sh`:

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
  [ "$LISTED" = "YES" ] && { echo "LISTED"; exit 0; }
  [ "$ESCROW" = "0" ] && { echo "Escrow empty"; exit 1; }
  sleep 60
done
```

```bash
chmod +x ~/monitor.sh
bash ~/monitor.sh $HARNESS
```

Tunggu sampai keluar `LISTED` atau `Escrow empty`. Biasa nunggu 10-30 menit kalo executor sehat.

---

## 13. Verifikasi di explorer

Setelah listed, buka:

- Agent page: `https://explorer.ritualfoundation.org/agents/<HARNESS>?type=sovereign`
- Atau scroll list: `https://explorer.ritualfoundation.org/agents?kind=sovereign`

Yang harus muncul:
- Status: `Sovereign / Monitored`
- Last Heartbeat: block number recent (bukan `—`)
- Transactions: `execute()` recurring dari `0x0000...fa7e` (system executor)

---

## 14. Soal revert internal

Pas lo klik tx scheduled `execute()` → tab Internal Transactions, bakal keliatan **3-5 "execution reverted"**. **Itu normal.** Semua sovereign agent yang listed juga begitu.

Harness pake try/catch logic untuk rolling window. Tiap `wakeUp`:
1. Coba promote successor window → revert kalo gak ada
2. Coba cancel previous window → revert kalo gak ada
3. Call sovereign precompile beneran terjadi **terakhir** di `harness → 0x0000...080c`

Revert ini gak bisa dihapus — contract harness immutable.

---

## 15. Catatan biaya

| Item | RIT |
|---|---|
| Faucet input | 1.0 (biasanya) |
| `deployHarness` gas | 0.0023 |
| `configureFundAndStart` gas | 0.003 |
| `configureFundAndStart` value (locked) | 0.500 |
| Buffer di EOA | 0.05 |
| **Total committed** | **~0.555** |
| Returned via gas refunds (over time) | sampai ~0.1 |

Escrow tetep ke-lock walau udah listed (buat bayar scheduled executions terus). Gak ada withdraw.

---

## 16. Error umum

### `DeploymentFailed() (0x30116425)`
Penyebab: gas limit kekecilan buat CREATE2 deploy.
Fix: naikin `--gas-limit` ke 5000000.

### `ERROR: Sender has a pending async job`
Penyebab: Phase 2 dari call sebelumnya belum delivery.
Fix: tunggu 10-30 menit atau pake burner wallet lain.

### `insufficient funds for gas * price + value`
Penyebab: balance native RIT < 0.5 + gas.
Fix: faucet lagi.

### Phase 2 timeout, callback gak delivery
Penyebab: Executor Ritual lagi backlog.
Fix: stop deploy, tunggu sampai count delivery di step 9 ≥ 5.

### Agent listed tapi `Last Heartbeat: —` dan gak ada tx di Transactions tab
Penyebab: explorer indexer lag, ATAU lo lagi view page address yang sebenernya kosong.
Fix: cek `api/agents/cache` langsung:
```bash
curl -s https://explorer.ritualfoundation.org/api/agents/cache \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([x for x in d['sovereign'] if x['address'].lower()=='HARNESS_LO_LOWERCASE'])"
```
Kalo list kosong, belum listed beneran. Page detail return template "Monitored" buat any address.

---

## 17. Strategi rotasi wallet

Jangan pake wallet yang sebelumnya gagal factory deploy. Harness dari wallet itu udah ke-fund permanen + salt udah ke-consume. Pake burner wallet baru tiap retry.

---

## 18. Klaim Genesis (opsional)

Setelah agent lo listed, lo mungkin eligible buat Ritual Genesis 1000:
1. Join Discord Ritual: https://discord.gg/ritual
2. Jalanin command: `/genesis_claim`
3. Kasih deskripsi 1 baris agent, contoh: *"A sovereign Ritual agent that analyzes AI x crypto trends."*

Eligibility ditentukan sama rules Ritual sendiri. Tutorial ini cuma cover technical deploy.

---

## Referensi

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

Pattern udah ke-verify dari listed agent `0x7D982c0e05Fe9DE98f006d6d629619Bf6caEE537` pada 2026-06-25. Factory ABI dari `ritual-foundation/ritual-dapp-skills/skills/ritual-dapp-agents/SKILL.md`.
