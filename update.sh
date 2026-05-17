#!/usr/bin/env bash
# Sincroniza las skills locales (~/.claude/skills/) al repo categorizado.
# Correr antes de commitear cambios en las skills.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$HOME/.claude/skills"

if [ ! -d "$SOURCE" ]; then
  echo "Error: No se encontró $SOURCE"
  exit 1
fi

echo "Sincronizando skills desde $SOURCE al repo..."

# Map skills to their categories
CORE_SKILLS="sitio-hoy sitio-hoy-briefing sitio-hoy-scaffold sitio-hoy-database sitio-hoy-project-director sitio-hoy-qa sitio-hoy-launch-automation"
DESIGN_SKILLS="ckm-design"
# Everything else goes to seo/

for skill in "$SOURCE"/*/; do
  [ -d "$skill" ] || continue
  name="$(basename "$skill")"

  if echo "$CORE_SKILLS" | grep -qw "$name"; then
    dest="$REPO_DIR/skills/core/$name"
  elif echo "$DESIGN_SKILLS" | grep -qw "$name"; then
    dest="$REPO_DIR/skills/design/$name"
  else
    dest="$REPO_DIR/skills/seo/$name"
  fi

  rm -rf "$dest"
  cp -r "$skill" "$dest"
done

echo "✓ Listo. Revisá los cambios con: git diff skills/"
echo ""
echo "Para pushear:"
echo "  git add skills/ && git commit -m 'feat: actualizar skills' && git push"
