# Dashboard

React dashboard for Smart Gateway Platform.

## Prerequisites

- Bun (JavaScript runtime and package manager)

## Quick Start

### Option 1: Source the setup script (Recommended for current session)

**IMPORTANT**: You must use `source` or `.`, NOT `./`:

```bash
source setup.sh    # ✅ Correct - runs in current shell
# OR
. setup.sh          # ✅ Also correct

bun install
bun run dev
```

**Why?** Running `./setup.sh` executes in a subshell, so PATH changes don't persist.

### Option 2: Use the activation script (Alternative)

If you prefer to execute a script directly:

```bash
./activate.sh       # Starts a new shell with Bun in PATH
bun install
bun run dev
```

### Option 3: Restart your terminal

After restarting, Bun will be available automatically:

```bash
bun install
bun run dev
```

### Option 4: Manual PATH setup (for current session)

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun install
bun run dev
```

## Available Scripts

- `bun run dev` - Start development server (port 3000)
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run lint` - Run ESLint

## Troubleshooting

### "command not found: bun" after running `./setup.sh`

**Problem**: You ran `./setup.sh` instead of `source setup.sh`

**Solution**: 
```bash
source setup.sh    # ✅ Use 'source' not './'
bun --version      # Should work now
```

### "command not found: bun" in general

1. **Quick fix**: Run `source setup.sh` in the dashboard directory
2. **Alternative**: Run `./activate.sh` to start a new shell with Bun
3. **Permanent fix**: Restart your terminal or run `exec /bin/zsh`
4. **Verify installation**: Check if Bun is installed: `ls -la ~/.bun/bin/bun`

### Understanding the difference

- `./setup.sh` - ❌ Runs in subshell, changes don't persist
- `source setup.sh` - ✅ Runs in current shell, changes persist
- `./activate.sh` - ✅ Executable script that starts new shell with Bun

## Development

The dashboard runs on `http://localhost:3000` and proxies API requests to `http://localhost:8080`.

