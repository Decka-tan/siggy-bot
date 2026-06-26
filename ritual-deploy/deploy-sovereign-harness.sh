#!/usr/bin/env bash
# Deploy Sovereign Agent V6+ via SovereignAgentFactory (proven pattern).
# REQUIRES: ~/.ritual_env_agent1 with PRIVATE_KEY, OPENAI_API_KEY, HF_TOKEN, HF_REPO_ID, RPC_URL
# COST: ~0.5 RIT (scheduler funding) + ~0.06 RIT gas + buffer = need >=0.6 RIT native
# Pattern verified: bytecode 10822 bytes, selectors 0xb1906702 + 0x18bb7d95
set -euo pipefail

source ~/.ritual_env_agent1

OWNER=$(cast wallet address "$PRIVATE_KEY")
[ "$OWNER" != "0x35292cb972eF6233E5d7651Ef7adBe0C1b2E5CCd" ] && { echo "Wrong owner: $OWNER"; exit 1; }

FACTORY=0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304
SALT_LABEL="${SALT_LABEL:-siggy-v6-$(date +%Y%m%d-%H%M)}"
SALT=$(cast keccak "$SALT_LABEL")

# Predict harness address
PREDICT=$(cast call $FACTORY "predictHarness(address,bytes32)(address,bytes32)" "$OWNER" "$SALT" --rpc-url "$RPC_URL")
HARNESS=$(echo "$PREDICT" | head -1)
echo "Salt label: $SALT_LABEL"
echo "Predicted harness: $HARNESS"

# Pre-check balance (need 0.6 RIT minimum)
BAL_WEI=$(cast balance "$OWNER" --rpc-url "$RPC_URL")
NEEDED=600000000000000000  # 0.6 RIT
[ "$(echo "$BAL_WEI < $NEEDED" | bc 2>/dev/null || python3 -c "print($BAL_WEI < $NEEDED)")" = "true" ] && {
  echo "❌ Need >=0.6 RIT, have $(python3 -c "print($BAL_WEI/1e18)") — abort"; exit 1;
}
echo "✅ Balance OK"

# Pre-check executor health by checking last sovereign Phase 2 delivery age
echo "⏱  Executor health probe..."
LATEST=$(cast block-number --rpc-url "$RPC_URL")
FROM=$((LATEST - 200))  # last ~70s
DELIVERY_COUNT=$(curl -s -X POST "$RPC_URL" -H "Content-Type: application/json" \
  --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getLogs\",\"params\":[{\"address\":\"0x5A16214fF555848411544b005f7Ac063742f39F6\",\"fromBlock\":\"$(printf '0x%x' $FROM)\"}],\"id\":1}" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']))")
echo "AsyncDelivery deliveries in last 200 blocks: $DELIVERY_COUNT"
[ "$DELIVERY_COUNT" -lt 3 ] && {
  echo "⚠️  WARN: Executor seems backlogged ($DELIVERY_COUNT < 3 recent deliveries)."
  echo "   Deploying now risks Phase 2 timeout → wakeUp revert loop → escrow drain."
  echo "   Recommend wait until >=5 deliveries/200 blocks."
  read -p "Continue anyway? (y/N) " ans
  [ "$ans" != "y" ] && exit 1
}

# Phase 1: deployHarness
echo ""
echo "=== Phase 1: deployHarness ==="
cast send $FACTORY "deployHarness(bytes32)" "$SALT" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3000000

# Verify bytecode matches template
SIZE=$(cast code "$HARNESS" --rpc-url "$RPC_URL" | wc -c)
[ "$SIZE" != "21647" ] && { echo "❌ Wrong bytecode size $SIZE (expected 21647)"; exit 1; }
echo "✅ Harness bytecode = 10822 bytes (template match)"

# Phase 2: build calldata via python + send
cd "$(dirname "$0")"
HARNESS=$HARNESS python3 build_calldata.py > /tmp/calldata.hex
CALLDATA=$(cat /tmp/calldata.hex)

echo ""
echo "=== Phase 2: configureFundAndStart{value: 0.5 RIT} ==="
cast send "$HARNESS" "$CALLDATA" --value 0.5ether \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --gas-limit 3500000

echo ""
echo "🎯 Deployed. Now waiting for Phase 2 delivery..."
echo "Harness:  $HARNESS"
echo "Explorer: https://explorer.ritualfoundation.org/address/$HARNESS"
echo ""
echo "Monitor: bash $(dirname "$0")/monitor.sh $HARNESS"
