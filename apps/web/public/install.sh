#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${GHOST_ENGINEER_REPO:-https://github.com/deepdevjose/ghost-engineer.git}"
INSTALL_DIR="${GHOST_ENGINEER_HOME:-${HOME}/.ghost-engineer/source}"
REF="${GHOST_ENGINEER_REF:-main}"
MIN_NODE_VERSION="22.15.0"
RERUN_INSTALL_CMD="curl -fsSL https://ghost-engineer.pages.dev/install.sh | bash"

print_rerun_instruction() {
  echo
  echo "After updating Node.js, rerun Ghost Engineer installer:"
  echo "${RERUN_INSTALL_CMD}"
}

is_fedora_rhel_like() {
  local os_tokens=""

  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    os_tokens="${ID:-} ${ID_LIKE:-}"
  fi

  case "${os_tokens}" in
    *fedora*|*rhel*|*centos*|*rocky*|*almalinux*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_macos() {
  case "${OSTYPE:-}" in
    darwin*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

print_node_upgrade_guidance() {
  echo
  echo "Node.js ${MIN_NODE_VERSION}+ is required for the complete Ghost Engineer + IBM Bob workflow."
  echo "Ghost does not install Node.js automatically or run privileged package-manager commands for you."
  echo

  if is_fedora_rhel_like && command -v dnf >/dev/null 2>&1; then
    echo "Detected Fedora/RHEL-style system with dnf. Suggested steps:"
    echo "  sudo dnf install -y nodejs"
    echo "  node --version"
    echo ""
    echo "If the installed Node.js version is below ${MIN_NODE_VERSION},"
    echo "use nvm (see below) or check:"
    echo "  https://nodejs.org/download/release/ for manual installation."
  elif is_macos && command -v brew >/dev/null 2>&1; then
    echo "Detected macOS with Homebrew. Suggested steps:"
    echo "  brew update"
    echo "  brew install node@22"
    echo "  brew link --overwrite --force node@22"
    echo "  node --version"
  else
    echo "Generic Unix fallback (nvm) to install Node 22 LTS safely for your user:"
    echo "  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
    echo "  export NVM_DIR=\"$HOME/.nvm\""
    echo "  [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\""
    echo "  nvm install 22"
    echo "  nvm use 22"
    echo "  node --version"
  fi

  print_rerun_instruction
}

normalize_semver_triplet() {
  local raw="$1"
  local cleaned="${raw#v}"
  local major="0"
  local minor="0"
  local patch="0"

  IFS='.' read -r major minor patch _rest <<<"${cleaned}"
  major="${major%%[^0-9]*}"
  minor="${minor%%[^0-9]*}"
  patch="${patch%%[^0-9]*}"

  major="${major:-0}"
  minor="${minor:-0}"
  patch="${patch:-0}"

  echo "${major} ${minor} ${patch}"
}

is_supported_node_version() {
  local version="$1"
  local min_version="$2"
  local ver_major ver_minor ver_patch
  local min_major min_minor min_patch

  read -r ver_major ver_minor ver_patch <<<"$(normalize_semver_triplet "${version}")"
  read -r min_major min_minor min_patch <<<"$(normalize_semver_triplet "${min_version}")"

  if [ "${ver_major}" -gt "${min_major}" ]; then
    return 0
  fi

  if [ "${ver_major}" -lt "${min_major}" ]; then
    return 1
  fi

  if [ "${ver_minor}" -gt "${min_minor}" ]; then
    return 0
  fi

  if [ "${ver_minor}" -lt "${min_minor}" ]; then
    return 1
  fi

  if [ "${ver_patch}" -ge "${min_patch}" ]; then
    return 0
  fi

  return 1
}

create_ghost_launcher() {
  local launcher_dir="${HOME}/.local/bin"
  local launcher="${launcher_dir}/ghost"

  mkdir -p "${launcher_dir}"

  cat > "${launcher}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${GHOST_ENGINEER_HOME:-${HOME}/.ghost-engineer/source}"
exec node "${INSTALL_DIR}/apps/cli/dist/index.js" "$@"
EOF

  chmod +x "${launcher}"

  echo "${launcher}"
}

ensure_local_bin_on_path() {
  local launcher_dir="${HOME}/.local/bin"
  local shell_profile=""

  if [ -z "${PATH##*${launcher_dir}*}" ]; then
    return 0
  fi

  echo
  echo "~/.local/bin is not on your PATH. Add it to ensure 'ghost' is available after restart:"
  echo

  if [ -n "${BASH_VERSION:-}" ]; then
    echo "For bash, add to ~/.bashrc:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  elif [ -n "${ZSH_VERSION:-}" ]; then
    echo "For zsh, add to ~/.zshrc:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  else
    echo "For your shell, add to your profile (~/.profile or similar):"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi

  echo
  echo "Then reload your shell:"
  echo "  source ~/.bashrc   # for bash"
  echo "  source ~/.zshrc    # for zsh"
  echo
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on PATH."
  print_node_upgrade_guidance
  exit 1
fi

NODE_VERSION="$(node --version 2>/dev/null || true)"

if [ -z "${NODE_VERSION}" ]; then
  echo "Node.js appears to be installed but its version could not be determined."
  print_node_upgrade_guidance
  exit 1
fi

if ! is_supported_node_version "${NODE_VERSION}" "${MIN_NODE_VERSION}"; then
  echo "Ghost Engineer requires Node.js ${MIN_NODE_VERSION} or newer. Found ${NODE_VERSION}."
  print_node_upgrade_guidance
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

launcher="$(create_ghost_launcher)"

if command -v ghost >/dev/null 2>&1; then
  echo "Ghost CLI installed: $(command -v ghost)"
  ghost --version
else
  ensure_local_bin_on_path
  echo "Ghost CLI created at: ${launcher}"
  echo "After adding ~/.local/bin to PATH and reloading your shell, run:"
  echo "  ghost --version"
fi

if command -v bob >/dev/null 2>&1; then
  echo "IBM Bob CLI detected: $(command -v bob)"
else
  echo "IBM Bob CLI was not detected."
  echo "Local analysis works without Bob, but the complete workflow is Bob-powered."
  echo "Run: ghost setup bob"
fi

echo "Ghost Engineer installed."
echo "Open any repository and run: ghost analyze ."
echo "For Bob-powered reasoning, run: ghost analyze . --bob"
