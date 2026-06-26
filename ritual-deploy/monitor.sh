#!/usr/bin/env bash
# Watch sovereign agent harness post-deploy. Pass harness addr as $1.
set -e
source ~/.ritual_env_agent1
HARNESS=${1:?usage: monitor.sh <harness_address>}

while true; do
  CACHE=$(curl -s https://explorer.ritualfoundation.org/api/agents/cache)
  LISTED=$(echo "$CACHE" | python3 -c "import json,sys; d=json.load(sys.stdin); t='${HARNESS,,}'; print('YES' if any(x['address'].lower()==t for x in d.get('sovereign',[])) else 'NO')")
  ESCROW=$(cast call 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948 "balanceOf(address)(uint256)" "$HARNESS" --rpc-url "$RPC_URL" | head -1)
  ESCROW_RIT=$(python3 -c "print($ESCROW/1e18)")
  P2=$(curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"0x23acdec\",\"topics\":[null,null,\"0x000000000000000000000000${HARNESS:2}\"]}],\"id\":1}" \
    | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']))")
  BLOCK=$(cast block-number --rpc-url "$RPC_URL")
  echo "[$(date +%H:%M:%S)] block=$BLOCK escrow=$ESCROW_RIT phase2=$P2 listed=$LISTED"
  [ "$LISTED" = "YES" ] && { echo "🎉 LISTED!"; exit 0; }
  [ "$ESCROW" = "0" ] && { echo "💀 Escrow empty"; exit 1; }
  sleep 60
done
