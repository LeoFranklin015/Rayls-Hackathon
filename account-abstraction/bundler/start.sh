#!/bin/bash
set -e

# Generate config.json from env vars
cat > /usr/app/config.json << ENDOFCONFIG
{
  "entryPoints": ["${BUNDLER_ENTRY_POINTS:-0x7c15F90346FeaF7CF68b4199711532CF04976F0b}"],
  "relayers": ["${BUNDLER_RELAYERS}"],
  "rpcEndpoint": "${BUNDLER_RPC_ENDPOINT:-https://testnet-rpc.rayls.com/}"
}
ENDOFCONFIG

echo "=== Generated config.json ==="
cat /usr/app/config.json
echo ""
echo "=== Starting Skandha bundler ==="

exec bun --bun /usr/app/packages/cli/bin/skandha standalone --unsafeMode --redirectRpc --api.port "${PORT:-14337}"
