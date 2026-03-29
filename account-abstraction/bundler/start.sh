#!/bin/sh
set -e

# Generate config.json from env vars
cat > /usr/app/config.json <<EOF
{
  "entryPoints": ["${BUNDLER_ENTRY_POINTS:-0x7c15F90346FeaF7CF68b4199711532CF04976F0b}"],
  "relayers": ["${BUNDLER_RELAYERS}"],
  "rpcEndpoint": "${BUNDLER_RPC_ENDPOINT:-https://testnet-rpc.rayls.com/}"
}
EOF

echo "Config generated:"
cat /usr/app/config.json

exec bun --bun ./packages/cli/bin/skandha standalone --unsafeMode --redirectRpc --api.port "${PORT:-14337}"
