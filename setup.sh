#!/bin/bash
# setup.sh — Setup completo del proyecto PrintOps Frontend

set -e  # Detener si cualquier comando falla

echo "======================================"
echo "  PrintOps Frontend — Setup Automático"
echo "======================================"

FRONTEND_DIR="/Users/juampibujaldon/Documents/GitHub/PrintOps-frontend"
TEMP_DIR="/tmp/PrintOpsSetup"

# ── 1. Verificar prerrequisitos ──────────────────────────────────────────────
echo ""
echo "▶ Verificando prerrequisitos..."

if ! command -v brew &>/dev/null; then
  echo "❌ Homebrew no encontrado. Instalá desde https://brew.sh"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "  → Instalando Node.js..."
  brew install node
fi
echo "  ✓ Node $(node --version)"

if ! command -v pod &>/dev/null; then
  echo "  → Instalando CocoaPods..."
  brew install cocoapods
fi
echo "  ✓ CocoaPods $(pod --version)"

# ── 2. Inicializar proyecto React Native en temp ─────────────────────────────
echo ""
echo "▶ Inicializando proyecto React Native 0.76.5..."
rm -rf "$TEMP_DIR"
npx @react-native-community/cli init PrintOpsTemp --version 0.76.5 --directory "$TEMP_DIR" --skip-git-init

# ── 3. Copiar archivos nativos al repo ───────────────────────────────────────
echo ""
echo "▶ Copiando archivos nativos al repositorio..."
cp -rf "$TEMP_DIR/ios"                "$FRONTEND_DIR/"
cp -rf "$TEMP_DIR/android"            "$FRONTEND_DIR/"
cp -f  "$TEMP_DIR/babel.config.js"    "$FRONTEND_DIR/"
cp -f  "$TEMP_DIR/metro.config.js"    "$FRONTEND_DIR/"
cp -f  "$TEMP_DIR/app.json"           "$FRONTEND_DIR/"
cp -f  "$TEMP_DIR/Gemfile"            "$FRONTEND_DIR/"
cp -f  "$TEMP_DIR/Gemfile.lock"       "$FRONTEND_DIR/"
cp -f  "$TEMP_DIR/index.js"           "$FRONTEND_DIR/"
echo "  ✓ Archivos copiados"

# ── 4. Instalar dependencias npm ─────────────────────────────────────────────
echo ""
echo "▶ Instalando dependencias npm..."
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps
echo "  ✓ npm install completado"

# ── 5. Instalar pods de iOS ──────────────────────────────────────────────────
echo ""
echo "▶ Instalando CocoaPods (puede tardar varios minutos)..."
cd "$FRONTEND_DIR/ios"
export NODE_BINARY=$(which node)
pod install
cd "$FRONTEND_DIR"
echo "  ✓ pod install completado"

# ── 6. Limpiar temp ──────────────────────────────────────────────────────────
echo ""
echo "▶ Limpiando archivos temporales..."
rm -rf "$TEMP_DIR"

# ── 7. Instrucciones finales ─────────────────────────────────────────────────
echo ""
echo "======================================"
echo "  ✅ Setup completado exitosamente!"
echo "======================================"
echo ""
echo "Para levantar la app abrí DOS terminales:"
echo ""
echo "  Terminal 1 (Metro bundler):"
echo "    cd $FRONTEND_DIR"
echo "    npx react-native start"
echo ""
echo "  Terminal 2 (Simulador iOS):"
echo "    cd $FRONTEND_DIR"
echo "    npx react-native run-ios"
echo ""
