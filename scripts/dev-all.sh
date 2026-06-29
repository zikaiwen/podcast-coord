#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for env_name in $(compgen -e); do
  case "$env_name" in
    npm_config_*|NPM_CONFIG_*) unset "$env_name" ;;
  esac
done

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -f "$ROOT_DIR/.nvmrc" ] && [ -d "$NVM_DIR/versions/node" ]; then
  wanted_node="$(tr -d '[:space:]' < "$ROOT_DIR/.nvmrc")"
  wanted_node="${wanted_node#v}"
  selected_node=""

  for node_dir in "$NVM_DIR/versions/node/v$wanted_node"*; do
    if [ -x "$node_dir/bin/node" ]; then
      selected_node="$node_dir"
    fi
  done

  if [ -n "$selected_node" ]; then
    export PATH="$selected_node/bin:$PATH"
    hash -r
  fi
fi

node_version="$(node -p "process.versions.node")"
IFS=. read -r node_major node_minor _ <<< "$node_version"

if [ "$node_major" -lt 20 ] || { [ "$node_major" -eq 20 ] && [ "$node_minor" -lt 19 ]; }; then
  echo "podcast-coord requires Node.js >=20.19.0, but this shell is using v$node_version."
  echo "Run 'nvm install && nvm use' in this repo, then try 'npm run dev:all' again."
  exit 1
fi

npm run server &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

npm run dev
