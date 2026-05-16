#!/bin/bash
# Builds "B&W Tasks.app" — a double-clickable Mac launcher for the NLP Todo app.
# Run from the project root: bash scripts/build-mac-app.sh

set -e

APP_NAME="B&W Tasks"
APP_DIR="${HOME}/Applications/${APP_NAME}.app"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Building ${APP_NAME}.app..."

# Create .app bundle structure
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources"

# Info.plist
cat > "${APP_DIR}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleIdentifier</key>
  <string>com.bwtasks.app</string>
  <key>CFBundleName</key>
  <string>B&amp;W Tasks</string>
  <key>CFBundleDisplayName</key>
  <string>B&amp;W Tasks</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleSignature</key>
  <string>????</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>LSUIElement</key>
  <false/>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

# Write the launcher script
cat > "${APP_DIR}/Contents/MacOS/launcher" << LAUNCHER
#!/bin/bash
PROJECT_DIR="${PROJECT_DIR}"
PORT=3000
LOG_DIR="\${HOME}/.bwtasks"
mkdir -p "\${LOG_DIR}"

# Check if server is already running
if lsof -ti tcp:\${PORT} > /dev/null 2>&1; then
  open "http://localhost:\${PORT}"
  exit 0
fi

# Show a startup notification via AppleScript
osascript -e 'display notification "Starting B&W Tasks…" with title "B&W Tasks"' 2>/dev/null || true

# Start Docker Postgres if not running
if command -v docker &>/dev/null; then
  (cd "\${PROJECT_DIR}" && docker compose up -d >> "\${LOG_DIR}/docker.log" 2>&1) &
  sleep 2
fi

# Start Next.js dev server in background
(cd "\${PROJECT_DIR}" && npm run dev >> "\${LOG_DIR}/server.log" 2>&1) &
SERVER_PID=\$!
echo \$SERVER_PID > "\${LOG_DIR}/server.pid"

# Wait for server to be ready (up to 30s)
for i in \$(seq 1 30); do
  if curl -sf "http://localhost:\${PORT}" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Open in default browser
open "http://localhost:\${PORT}"

# Notify ready
osascript -e 'display notification "B&W Tasks is ready" with title "B&W Tasks"' 2>/dev/null || true
LAUNCHER

chmod +x "${APP_DIR}/Contents/MacOS/launcher"

# Generate a minimal 1024×1024 icon using sips if ImageMagick not available
ICONSET="${APP_DIR}/Contents/Resources/AppIcon.iconset"
mkdir -p "${ICONSET}"

# Create a simple icon using Python (no external deps)
python3 << 'PYICON'
import struct, zlib, os

def make_png(size, bg=(0,0,0), fg=(255,255,255)):
    """Create a minimal PNG with a B&W circle and B&W text."""
    # Use PIL if available, else write a plain black square PNG
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new("RGB", (size, size), bg)
        d = ImageDraw.Draw(img)
        # Circle background
        pad = size // 8
        d.ellipse([pad, pad, size-pad, size-pad], fill=bg)
        # B&W text centered
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size // 4)
        except Exception:
            font = ImageFont.load_default()
        text = "B&W"
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        d.text(((size-tw)//2, (size-th)//2), text, fill=fg, font=font)
        return img
    except ImportError:
        from PIL import Image
        img = Image.new("RGB", (size, size), (0, 0, 0))
        return img

import sys
output_dir = sys.argv[1] if len(sys.argv) > 1 else "."

try:
    from PIL import Image, ImageDraw, ImageFont
    for sz in [16, 32, 64, 128, 256, 512, 1024]:
        img = Image.new("RGB", (sz, sz), (0, 0, 0))
        d = ImageDraw.Draw(img)
        pad = sz // 10
        d.ellipse([pad, pad, sz-pad, sz-pad], fill=(0, 0, 0))
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", max(8, sz // 4))
        except Exception:
            font = ImageFont.load_default()
        text = "B&W"
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        d.text(((sz-tw)//2, (sz-th)//2), text, fill=(255,255,255), font=font)
        img.save(f"{output_dir}/icon_{sz}x{sz}.png")
        if sz <= 512:
            img.save(f"{output_dir}/icon_{sz}x{sz}@2x.png")
    print("Icons created with PIL")
except ImportError:
    # Fallback: write a minimal valid black PNG
    def write_png(path, w, h):
        def chunk(ctype, data):
            c = zlib.crc32(ctype + data) & 0xffffffff
            return struct.pack('>I', len(data)) + ctype + data + struct.pack('>I', c)
        raw = b'\x00' + b'\x00\x00\x00' * w
        compressed = zlib.compress(raw * h)
        sig = b'\x89PNG\r\n\x1a\n'
        ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
        idat = chunk(b'IDAT', compressed)
        iend = chunk(b'IEND', b'')
        with open(path, 'wb') as f:
            f.write(sig + ihdr + idat + iend)
    for sz in [16, 32, 64, 128, 256, 512, 1024]:
        write_png(f"{output_dir}/icon_{sz}x{sz}.png", sz, sz)
        if sz <= 512:
            write_png(f"{output_dir}/icon_{sz}x{sz}@2x.png", sz, sz)
    print("Icons created (plain fallback)")
PYICON

# Compile iconset to icns
if command -v iconutil &>/dev/null; then
  python3 scripts/make-icons.py "${ICONSET}" 2>/dev/null || true
  iconutil -c icns "${ICONSET}" -o "${APP_DIR}/Contents/Resources/AppIcon.icns" 2>/dev/null || true
  rm -rf "${ICONSET}"
fi

echo ""
echo "✓ Built: ${APP_DIR}"
echo ""
echo "To launch: open '${APP_DIR}'"
echo "Or: double-click 'B&W Tasks' in ~/Applications"
echo ""
echo "The app will:"
echo "  1. Start PostgreSQL (Docker)"
echo "  2. Start the Next.js dev server"
echo "  3. Open http://localhost:3000 in your browser"
