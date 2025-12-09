#!/bin/bash
# Alternative activation script that can be executed directly
# This script spawns a new shell with Bun in PATH

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify bun is available
if ! command -v bun &> /dev/null; then
    echo "✗ Bun is not installed. Please install it first:" >&2
    echo "  curl -fsSL https://bun.sh/install | bash" >&2
    exit 1
fi

echo "✓ Bun is available: $(bun --version)"
echo "✓ Starting new shell with Bun in PATH..."
echo ""

# Start a new shell with the updated PATH
exec "$SHELL"



