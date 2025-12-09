#!/bin/bash
# Setup script to ensure Bun is available in the current shell session
# IMPORTANT: This script MUST be sourced, not executed directly!
# Usage: source setup.sh  (or: . setup.sh)

# Detect if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed directly (not sourced)
    echo "⚠️  ERROR: This script must be SOURCED, not executed!" >&2
    echo "" >&2
    echo "❌ You ran: ./setup.sh" >&2
    echo "✅ You should run: source setup.sh" >&2
    echo "   OR: . setup.sh" >&2
    echo "" >&2
    echo "The difference:" >&2
    echo "  ./setup.sh     - Runs in a subshell (changes don't persist)" >&2
    echo "  source setup.sh - Runs in current shell (changes persist)" >&2
    exit 1
fi

# Script is being sourced - proceed with setup
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify bun is available
if command -v bun &> /dev/null; then
    echo "✓ Bun is now available: $(bun --version)"
    echo "✓ You can now run: bun install, bun run dev, etc."
else
    echo "✗ Bun is not installed. Please install it first:" >&2
    echo "  curl -fsSL https://bun.sh/install | bash" >&2
    return 1 2>/dev/null || exit 1
fi