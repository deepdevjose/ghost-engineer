#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="${GHOST_ENGINEER_PACKAGE:-ghost-engineer}"

if ! command -v node >/dev/null 2>&1; then
  echo "Ghost Engineer requires Node.js 20 or newer."
  echo "Install Node.js first, then run this installer again."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Ghost Engineer requires Node.js 20 or newer. Found $(node --version)."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found on PATH."
  exit 1
fi

echo "Installing ${PACKAGE_NAME} globally..."
npm install -g "${PACKAGE_NAME}"

if command -v bob >/dev/null 2>&1; then
  echo "IBM Bob CLI detected: $(command -v bob)"
else
  echo "IBM Bob CLI was not detected. Ghost local analysis works without Bob, but --bob commands need it."
fi

echo "Ghost Engineer installed."
echo "Try: ghost analyze ."
