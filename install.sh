#!/usr/bin/env bash
# SitioHoy AI Context Installer
# Instala el contexto del sistema en la carpeta donde estás parado.
#
# Uso:
#   ./install.sh
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(pwd)"
CREDS_FILE="$HOME/.sitiohoy/credentials.env"
GITHUB_REPO="Sitio-Hoy-Tech/sitiohoy-skills"

# ── Colores ───────────────────────────────────────────────────────────────────
CY=$'\033[38;2;34;163;91m'
GY=$'\033[38;2;120;120;120m'
BD=$'\033[1m'
RS=$'\033[0m'
YELLOW=$'\033[1;33m'

info()    { printf "  %s→%s %s\n" "$CY" "$RS" "$1"; }
success() { printf "  %s✓%s %s\n" "$CY" "$RS" "$1"; }
warn()    { printf "  %s⚠%s  %s\n" "$YELLOW" "$RS" "$1"; }

# ── Logo ──────────────────────────────────────────────────────────────────────
print_logo() {
  local g=$'\033[48;2;34;163;91m'
  local w=$'\033[38;2;255;255;255m'
  local t=$'\033[38;2;34;163;91m'
  local r=$'\033[0m'
  printf "\n"
  printf "  %s%s                   %s\n" "$g" "$w" "$r"
  printf "  %s%s   ██████████      %s\n" "$g" "$w" "$r"
  printf "  %s%s   ██      ██      %s\n" "$g" "$w" "$r"
  printf "  %s%s   ██              %s\n" "$g" "$w" "$r"
  printf "  %s%s   ████████        %s\n" "$g" "$w" "$r"
  printf "  %s%s          ██       %s\n" "$g" "$w" "$r"
  printf "  %s%s   ██      ██      %s\n" "$g" "$w" "$r"
  printf "  %s%s   ██████████      %s\n" "$g" "$w" "$r"
  printf "  %s%s                   %s\n" "$g" "$w" "$r"
  printf "\n  %s%sSitioHoy%s  AI Context Installer\n\n" "$t" "$BD" "$r"
}

print_logo
printf "  %s📁 Destino:%s %s%s%s\n\n" "$GY" "$RS" "$BD" "$TARGET_DIR" "$RS"

# ── Menú interactivo via Node.js ──────────────────────────────────────────────
# Node tiene soporte nativo de flechas en todos los sistemas.
# Escribe el script a un archivo temp, lo ejecuta, y lee el índice devuelto.
MENU_RESULT=0
MENU_SCRIPT="/tmp/sitiohoy-menu-$$.mjs"

cat > "$MENU_SCRIPT" << 'NODESCRIPT'
import readline from 'readline'

const [,, title, ...options] = process.argv
if (!options.length) { process.stdout.write('0\n'); process.exit(0) }

const CY  = '\x1b[38;2;34;163;91m'
const GY  = '\x1b[38;2;120;120;120m'
const BD  = '\x1b[1m'
const RS  = '\x1b[0m'
const SEL = '\x1b[1m\x1b[38;2;34;163;91m'

let current = 0
const total = options.length

// Ancho dinámico: el más largo entre título y opciones, mínimo 30
const innerW = Math.max(title.length, ...options.map(o => o.length + 4), 30)
const bar = '─'.repeat(innerW + 2)

function draw() {
  process.stderr.write(`  ${CY}╭${bar}╮${RS}\n`)
  process.stderr.write(`  ${CY}│${RS}  ${BD}${title.padEnd(innerW)}${RS}  ${CY}│${RS}\n`)
  process.stderr.write(`  ${CY}├${bar}┤${RS}\n`)
  for (let i = 0; i < options.length; i++) {
    const label = options[i].padEnd(innerW - 2)
    if (i === current) {
      process.stderr.write(`  ${CY}│${RS}  ${SEL}▶ ${label}${RS}  ${CY}│${RS}\n`)
    } else {
      process.stderr.write(`  ${CY}│${RS}    ${label}  ${CY}│${RS}\n`)
    }
  }
  process.stderr.write(`  ${CY}╰${bar}╯${RS}\n`)
  process.stderr.write(`  ${GY}↑↓ navegar · Enter confirmar${RS}\n`)
}

function erase() {
  const lines = total + 5
  for (let i = 0; i < lines; i++) {
    process.stderr.write('\x1b[A\x1b[2K')
  }
}

readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) process.stdin.setRawMode(true)

// Ocultar cursor
process.stderr.write('\x1b[?25l')
draw()

process.stdin.on('keypress', (_, key) => {
  if (!key) return
  if (key.name === 'up') {
    erase()
    current = (current - 1 + total) % total
    draw()
  } else if (key.name === 'down') {
    erase()
    current = (current + 1) % total
    draw()
  } else if (key.name === 'return' || key.name === 'enter') {
    erase()
    process.stderr.write(`  \x1b[38;2;34;163;91m✓\x1b[0m ${BD}${options[current]}${RS}\n\n`)
    process.stderr.write('\x1b[?25h')  // Mostrar cursor
    process.stdout.write(`${current}\n`)
    process.exit(0)
  } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
    process.stderr.write('\x1b[?25h')
    process.exit(1)
  }
})
NODESCRIPT

run_menu() {
  local title="$1"; shift
  local opts=("$@")
  # stderr va directo a la terminal (menú visual), stdout captura el índice elegido
  local result
  result=$(node "$MENU_SCRIPT" "$title" "${opts[@]}" 2>/dev/tty) || { printf '\033[?25h'; exit 1; }
  MENU_RESULT=$result
}

cleanup_all() {
  printf '\033[?25h'
  rm -f "$MENU_SCRIPT"
  [ -n "$TEMP_CLONE" ] && rm -rf "$TEMP_CLONE"
}
TEMP_CLONE=""
trap cleanup_all EXIT

# ── Obtener última versión desde GitHub ───────────────────────────────────────
if [ "$REPO_DIR" != "$(pwd)" ]; then
  true  # ejecutado desde el repo local
else
  TEMP_CLONE="$(mktemp -d)"
  info "Descargando versión más reciente..."
  URL="https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz"
  if curl -fsSL "$URL" | tar -xz -C "$TEMP_CLONE" --strip-components=1 2>/dev/null; then
    REPO_DIR="$TEMP_CLONE"
    success "Última versión lista."
  else
    warn "No se pudo conectar a GitHub. Usando instalación local."
    rm -rf "$TEMP_CLONE"; TEMP_CLONE=""
  fi
fi

# ── Elegir IA ─────────────────────────────────────────────────────────────────
AI_OPTIONS=(
  "Claude Code   (CLAUDE.md + .claude/skills/)"
  "OpenAI Codex  (AGENTS.md + .agents/skills/)"
  "OpenCode      (AGENTS.md + .opencode/skills/)"
  "Todas"
)

run_menu "¿Para qué IA instalamos?" "${AI_OPTIONS[@]}"
ai_choice=$MENU_RESULT   # 0=Claude 1=Codex 2=OpenCode 3=Todas

# ── Credenciales Supabase ─────────────────────────────────────────────────────
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

if [ -f "$CREDS_FILE" ]; then
  # shellcheck source=/dev/null
  source "$CREDS_FILE"
  printf "  %sCreds guardadas encontradas:%s\n" "$GY" "$RS"
  printf "  URL: %s\n" "$SUPABASE_URL"
  printf "  Anon Key: %s...\n\n" "${SUPABASE_ANON_KEY:0:20}"
  printf "  ¿Usar estas credenciales? [S/n]: "
  read -r use_saved; use_saved="${use_saved:-S}"
fi

if [ ! -f "$CREDS_FILE" ] || [[ "$use_saved" =~ ^[nN]$ ]]; then
  printf "\n"
  printf "  SUPABASE_URL: "; read -r SUPABASE_URL
  printf "  ANON_KEY: ";     read -r SUPABASE_ANON_KEY
  printf "  SERVICE_ROLE_KEY (oculto): "; read -rs SUPABASE_SERVICE_ROLE_KEY; printf "\n\n"

  mkdir -p "$HOME/.sitiohoy"
  cat > "$CREDS_FILE" <<ENVFILE
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENVFILE
  chmod 600 "$CREDS_FILE"
  success "Credenciales guardadas en ~/.sitiohoy/credentials.env"
fi

# ── Bloque de contexto ────────────────────────────────────────────────────────
generate_context_block() {
cat <<CONTEXTMD
# SitioHoy — Contexto del sistema

Sos el AI developer de SitioHoy. Generás sitios web completos para clientes
bajo tres planes usando el stack definido aquí. Seguís el protocolo de módulos
en orden. Respondés en español.

## Infraestructura Supabase (instancia única — multitenant)

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
\`\`\`

> SERVICE_ROLE_KEY nunca con prefijo NEXT_PUBLIC_.

## Stack

- Next.js 15+ App Router (Server Components por defecto)
- Supabase (PostgreSQL + RLS multitenant)
- MercadoPago Bricks
- Resend
- Envia.com (Plan Empresa)
- Umami Analytics
- Vercel (región gru1 — São Paulo)

Reglas no negociables:
- \`next/image\` siempre — nunca \`<img>\` nativo
- \`next/font\` siempre — nunca \`<link>\` externo
- \`unstable_cache\` + \`revalidateTag()\` — nunca \`revalidatePath('/')\` global ni \`revalidate: N\`
- \`'use client'\` solo para estado/efectos/eventos
- Server Actions para mutaciones (no API routes innecesarias)
- Mobile-first desde 375px

## Planes

| Plan | Productos | Pagos | Envíos |
|---|---|---|---|
| Esencial | ≤50 | WhatsApp | No |
| Emprendimiento | ≤200 | MercadoPago | Zonas fijas |
| Empresa | Ilimitado | MercadoPago | Envia.com |

## Protocolo de módulos

1. Briefing → \`sitiohoy.config.json\` + \`brief.md\`
2. Scaffold → base Next.js + scripts QA
3. Database → migración SQL + seed admin
4. Módulos de negocio (según plan, en orden estricto)
5. QA tras cada módulo
6. Launch (solo con QA aprobado)

Modo silencioso: ejecutar sin pedir confirmación. Solo hablar ante error crítico o dato faltante sin placeholder posible.
Al finalizar módulo: \`Módulo N ✅ · Listo para N+1\`
CONTEXTMD
}

# ── Instaladores por IA ───────────────────────────────────────────────────────

flatten_skills() {
  # Copy skills from categorized repo structure to flat target directory.
  # Repo: skills/core/sitio-hoy/, skills/seo/seo-audit/, skills/design/ckm-design/
  # Target: flat directory with each skill as direct subfolder.
  local dest="$1"
  rm -rf "$dest"
  mkdir -p "$dest"
  for category in "$REPO_DIR/skills/"*/; do
    for skill in "$category"*/; do
      [ -d "$skill" ] || continue
      local name
      name="$(basename "$skill")"
      cp -r "$skill" "$dest/$name"
    done
  done
}

install_claude() {
  local skills_dir="$TARGET_DIR/.claude/skills"
  local claude_md="$TARGET_DIR/CLAUDE.md"

  flatten_skills "$skills_dir"

  touch "$claude_md"
  if ! grep -q "SITIOHOY-CONTEXT-START" "$claude_md" 2>/dev/null; then
    cat >> "$claude_md" <<CLAUDEMD

<!-- SITIOHOY-CONTEXT-START -->
$(generate_context_block)
<!-- SITIOHOY-CONTEXT-END -->
CLAUDEMD
  fi

  success "Claude Code → CLAUDE.md + .claude/skills/ (${skills_dir})"
  printf "  %sLas skills se cargan por proyecto, no globalmente.%s\n" "$GY" "$RS"
}

install_codex() {
  local skills_dir="$TARGET_DIR/.agents/skills"
  local agents_md="$TARGET_DIR/AGENTS.md"

  flatten_skills "$skills_dir"
  generate_context_block > "$agents_md"

  cat >> "$agents_md" <<'SKILLINDEX'

## Skills disponibles

Las siguientes skills están en `.agents/skills/`. Para usar una skill,
leer el archivo `.agents/skills/<nombre>/SKILL.md` correspondiente.

Skills SitioHoy:
- `sitio-hoy` — Orquestador principal
- `sitio-hoy-briefing` — Onboarding + config
- `sitio-hoy-scaffold` — Base Next.js + Supabase
- `sitio-hoy-database` — Migraciones + RLS + seed admin
- `sitio-hoy-qa` — Validación automática
- `sitio-hoy-launch-automation` — Deploy GitHub + Vercel + Supabase
- `sitio-hoy-project-director` — Context packs + dirección visual
SKILLINDEX

  success "OpenAI Codex → AGENTS.md + .agents/skills/ (${skills_dir})"
}

install_opencode() {
  local skills_dir="$TARGET_DIR/.opencode/skills"
  local agents_md="$TARGET_DIR/AGENTS.md"

  flatten_skills "$skills_dir"
  generate_context_block > "$agents_md"

  cat >> "$agents_md" <<'SKILLINDEX'

## Skills disponibles

Las siguientes skills están en `.opencode/skills/`. Para usar una skill,
leer el archivo `.opencode/skills/<nombre>/SKILL.md` correspondiente.

Skills SitioHoy:
- `sitio-hoy` — Orquestador principal
- `sitio-hoy-briefing` — Onboarding + config
- `sitio-hoy-scaffold` — Base Next.js + Supabase
- `sitio-hoy-database` — Migraciones + RLS + seed admin
- `sitio-hoy-qa` — Validación automática
- `sitio-hoy-launch-automation` — Deploy GitHub + Vercel + Supabase
- `sitio-hoy-project-director` — Context packs + dirección visual
SKILLINDEX

  success "OpenCode → AGENTS.md + .opencode/skills/ (${skills_dir})"
}

# ── Copiar logo ───────────────────────────────────────────────────────────────
copy_logo() {
  local dest="$TARGET_DIR/logo-sitiohoy.png"
  local logo_url="https://raw.githubusercontent.com/Sitio-Hoy-Tech/sitiohoy-skills/main/assets/logo-sitiohoy.png"
  if curl -fsSL "$logo_url" -o "$dest" 2>/dev/null; then
    success "Logo → logo-sitiohoy.png"
  elif [ -f "$REPO_DIR/assets/logo-sitiohoy.png" ]; then
    cp "$REPO_DIR/assets/logo-sitiohoy.png" "$dest"
    success "Logo → logo-sitiohoy.png (local)"
  fi
}

# ── Ejecutar ──────────────────────────────────────────────────────────────────
printf "  %s── Instalando...%s\n\n" "$GY" "$RS"

case "$ai_choice" in
  0) install_claude   ;;
  1) install_codex    ;;
  2) install_opencode ;;
  3)
    install_claude
    install_codex
    install_opencode
    ;;
esac

copy_logo

printf "\n  %s%s✓ Instalación completa%s\n\n" "$CY" "$BD" "$RS"
printf "  Archivos en: %s%s%s\n\n" "$BD" "$TARGET_DIR" "$RS"
