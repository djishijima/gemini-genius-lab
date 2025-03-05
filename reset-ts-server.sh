#!/bin/bash
# This script resets the TypeScript language server in most IDEs
# Run this if you're still seeing type errors in node_modules

# Remove .ts-cache if it exists
rm -rf ./.ts-cache 2>/dev/null

# Remove TS cache in VSCode directory if it exists
rm -rf ./.vscode/.tscache 2>/dev/null
rm -rf ./.vscode/.eslintcache 2>/dev/null

echo "TypeScript server cache cleared."
echo "Please restart your IDE for changes to take effect."
