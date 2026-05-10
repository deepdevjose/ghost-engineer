#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${GHOST_ENGINEER_REPO:-https://github.com/deepdevjose/ghost-engineer.git}"
INSTALL_DIR="${GHOST_ENGINEER_HOME:-${HOME}/.ghost-engineer/source}"
REF="${GHOST_ENGINEER_REF:-main}"

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

if ! command -v git >/dev/null 2>&1; then
  echo "git was not found on PATH."
  echo "The 0.1 installer installs Ghost Engineer from source."
  exit 1
fi

if [ -d "${INSTALL_DIR}/.git" ]; then
  echo "Updating Ghost Engineer source at ${INSTALL_DIR}..."
  git -C "${INSTALL_DIR}" fetch --tags origin
else
  echo "Cloning Ghost Engineer into ${INSTALL_DIR}..."
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

git -C "${INSTALL_DIR}" checkout "${REF}"
git -C "${INSTALL_DIR}" pull --ff-only origin "${REF}" || true

cd "${INSTALL_DIR}"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

(
  cd apps/cli
  npm link
)

if command -v ghost >/dev/null 2>&1; then
  echo "Ghost CLI linked: $(command -v ghost)"
  ghost --version
else
  echo "Ghost CLI was linked, but 'ghost' is not on PATH."
  echo "Check your npm global prefix with: npm prefix -g"
  exit 1
fi

if command -v bob >/dev/null 2>&1; then
  echo "IBM Bob CLI detected: $(command -v bob)"
else
  echo "IBM Bob CLI was not detected. Local analysis works without Bob; --bob commands need Bob later."
fi

echo "Ghost Engineer installed."
echo "Open any repository and run: ghost analyze ."
