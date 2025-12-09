#!/bin/bash
# Verification script to check if Bun is properly set up

echo "Checking Bun installation..."

# Check if bun is in PATH
if command -v bun &> /dev/null; then
    echo "✓ Bun found in PATH: $(which bun)"
    echo "✓ Bun version: $(bun --version)"
    exit 0
fi

# Check if bun is installed but not in PATH
if [ -f "$HOME/.bun/bin/bun" ]; then
    echo "⚠ Bun is installed but not in PATH"
    echo "  Location: $HOME/.bun/bin/bun"
    echo ""
    echo "To fix this, run:"
    echo "  source setup.sh"
    echo "  OR"
    echo "  export PATH=\"\$HOME/.bun/bin:\$PATH\""
    exit 1
fi

# Bun is not installed
echo "✗ Bun is not installed"
echo ""
echo "To install Bun, run:"
echo "  curl -fsSL https://bun.sh/install | bash"
echo "  exec /bin/zsh  # Restart shell"
exit 1



