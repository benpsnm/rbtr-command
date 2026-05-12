# Git Worktree Cheatsheet — rbtr-command

## Active worktrees

| Path | Branch | Purpose |
|---|---|---|
| `~/Desktop/rbtr-command` | `feature/atlas-v2.2-intelligence-stack` | Main working tree |
| `~/Desktop/rbtr-command-supabase-build` | `feature/standalone-supabase-build` | Standalone WMS → Supabase wire-up (spec at state-snapshots/standalone-supabase-spec.md) |
| `~/Desktop/rbtr-command-intel-fix` | `feature/intel-enrichment-fix` | Enrichment failure investigation + fix |

## Common commands

```bash
# List all worktrees and their branches
git worktree list

# Switch to supabase build worktree
cd ~/Desktop/rbtr-command-supabase-build

# Switch to intel fix worktree
cd ~/Desktop/rbtr-command-intel-fix

# Add a new worktree on an existing branch
git worktree add ../rbtr-command-<name> <branch>

# Add a new worktree on a NEW branch
git worktree add ../rbtr-command-<name> -b feature/<name>

# Remove a worktree (after merging / abandoning)
git worktree remove ../rbtr-command-<name>
# or if it has uncommitted changes:
git worktree remove --force ../rbtr-command-<name>

# Prune stale worktree refs (after manual directory deletion)
git worktree prune
```

## Rules

- Each worktree is an independent checkout — files edited in one worktree do not appear in others until committed + merged.
- Never check out the same branch in two worktrees simultaneously — git will refuse.
- `git status`, `git add`, `git commit` in a worktree only affect that worktree's branch.
- The main tree's `.claude/`, `CLAUDE.md`, and `PSNM_STATE.md` are shared via the common `.git` — edits there affect all worktrees after commit.

## Workflow pattern for parallel tracks

```
rbtr-command (main tree)          rbtr-command-supabase-build     rbtr-command-intel-fix
──────────────────────────────    ──────────────────────────────   ────────────────────────
claude + main session context     separate claude session          separate claude session
feature/atlas-v2.2-*              feature/standalone-supabase-*    feature/intel-enrichment-*
```

When a feature branch is ready, merge it back to `main` via PR from `rbtr-command` main tree:
```bash
cd ~/Desktop/rbtr-command
git merge --no-ff feature/standalone-supabase-build
```
