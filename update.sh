#!/usr/bin/env bash
# Sincroniza las skills locales (~/.claude/skills/) al repo.
# Correr antes de commitear cambios en las skills.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Sincronizando skills desde ~/.claude/skills/ al repo..."
rsync -a --delete "$HOME/.claude/skills/" "$REPO_DIR/skills/"
echo "✓ Listo. Revisá los cambios con: git diff skills/"
echo ""
echo "Para pushear:"
echo "  git add skills/ && git commit -m 'feat: actualizar skills' && git push"
