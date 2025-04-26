#!/bin/bash
# mcpcontrol-wrapper.sh - Bridge script for Claude CLI to run MCPControl from WSL

# Windows path translation
WIN_PATH=$(echo "$PWD" | sed -E 's|^/mnt/([a-z])(/.*)|\1:\\\2|g' | sed 's|/|\\|g')

# Run PowerShell.exe with absolute path to ensure it's found
exec /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -c "cd '$WIN_PATH'; npm run build; node build/index.js"
