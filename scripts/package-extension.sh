# Shared packaging helper for Real family MV3 extensions (no build step).
# Produces dist/<name>-<version>.zip with manifest.json at the ZIP root.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f manifest.json ]; then
  echo "manifest.json not found in ${ROOT}" >&2
  exit 1
fi

NAME="$(basename "$ROOT")"
VERSION="$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')"
OUT_DIR="${ROOT}/dist"
OUT_ZIP="${OUT_DIR}/${NAME}-${VERSION}.zip"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_ZIP}"

# Runtime package only — exclude store copy, tests, and packaging helpers from review ZIP.
# shellcheck disable=SC2086
zip -r "${OUT_ZIP}" . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.venv*" \
  -x "dist/*" \
  -x "*.zip" \
  -x ".DS_Store" \
  -x "**/.DS_Store" \
  -x "store/*" \
  -x "scripts/*" \
  -x "coverage/*" \
  -x ".github/*" \
  -x "e2e/*" \
  -x "playwright-report/*" \
  -x "test-results/*" \
  -x "playwright.config.ts" \
  -x "package.json" \
  -x "package-lock.json" \
  -x "tsconfig.json" \
  -x "_*" \
  -x "*.pyc" \
  -x "**/__pycache__/*" \
  -x "DESIGN.md" \
  -x "README.md" \
  -x "PRIVACY.md" \
  -x "icons/*source*" \
  -x "icons/paw-pause-icon-source.png" \
  -x "assets/sounds/meow/*.md" \
  -x "assets/sounds/meow/manifest.json" \
  -x "assets/sounds/meow/ids.json" \
  -x "assets/sounds/meow/mixkit-manifest.json" \
  -x "demo-article.html"

echo "Created ${OUT_ZIP}"
unzip -l "${OUT_ZIP}" | head -40 || true
ls -lh "${OUT_ZIP}"
