#!/usr/bin/env python3
"""Build configureFundAndStart calldata. Reads HARNESS env, prints hex calldata to stdout.
Reuses sovereign-agent example pattern: HF storage, OPENAI provider, gpt-4o-mini.
"""
import os, json, sys
from ecies import encrypt as ecies_encrypt
from ecies.config import ECIES_CONFIG
from eth_abi.abi import encode as abi_encode
from web3 import Web3

ECIES_CONFIG.symmetric_nonce_length = 12

RPC      = os.environ['RPC_URL']
REGISTRY = '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F'
HARNESS  = os.environ['HARNESS']
HF_REPO  = os.environ.get('HF_REPO_ID', 'decka-tan/ritual-sovereign-agent')

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

api_key = os.environ['OPENAI_API_KEY']
enc_secrets = ecies_encrypt(pubkey, json.dumps({"OPENAI_API_KEY": api_key}).encode())

params = (
    EXECUTOR, 500, b'', 5, 6000,
    'SOVEREIGN_AGENT_TASK',
    HARNESS,
    bytes.fromhex('8ca12055'),
    3_000_000, 1_000_000_000, 100_000_000, 5,
    os.environ.get('PROMPT', "You are Siggy, a sovereign Ritual agent. Analyze one trend at AI x crypto intersection, suggest one product idea, return short confirmation."),
    enc_secrets,
    ('hf', f'{HF_REPO}/sessions/session-001.jsonl', 'HF_TOKEN'),
    ('hf', f'{HF_REPO}/artifacts/', 'HF_TOKEN'),
    [],
    ('hf', f'{HF_REPO}/prompts/default-system.md', ''),
    'gpt-4o-mini',
    [], 50, 8192, '',
)
schedule = (500_000, 2000, 500, 20_000_000_000, 1_000_000_000, 0)
rolling  = (5, 5000, 1)
LOCK_DURATION = 100_000_000

PARAMS_T = "(address,uint256,bytes,uint64,uint64,string,address,bytes4,uint256,uint256,uint256,uint16,string,bytes,(string,string,string),(string,string,string),(string,string,string)[],(string,string,string),string,string[],uint16,uint32,string)"
SCHED_T  = "(uint32,uint32,uint32,uint256,uint256,uint256)"
ROLL_T   = "(uint32,uint16,uint16)"

sig = f"configureFundAndStart({PARAMS_T},{SCHED_T},{ROLL_T},uint256)"
selector = Web3.keccak(text=sig)[:4]
assert selector.hex() == 'b1906702', f"selector mismatch: {selector.hex()}"

args = abi_encode([PARAMS_T, SCHED_T, ROLL_T, "uint256"], [params, schedule, rolling, LOCK_DURATION])
print('0x' + selector.hex() + args.hex())
