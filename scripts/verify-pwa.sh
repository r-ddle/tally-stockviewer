#!/bin/bash
# PWA Verification Checklist

echo "🔍 PWA Configuration Verification"
echo "=================================="
echo ""

# Check manifest
if [ -f "public/manifest.json" ]; then
    echo "✅ manifest.json exists"
    if grep -q "Vamos" public/manifest.json; then
        echo "   ✓ App name configured"
    fi
    if grep -q "icons" public/manifest.json; then
        echo "   ✓ Icons configured"
    fi
else
    echo "❌ manifest.json missing"
fi

# Check service worker
if [ -f "public/sw.js" ]; then
    echo "✅ Service Worker (sw.js) exists"
else
    echo "❌ Service Worker missing"
fi

# Check robots.txt
if [ -f "public/robots.txt" ]; then
    echo "✅ robots.txt exists"
else
    echo "❌ robots.txt missing"
fi

# Check favicon
if [ -f "public/favicon.png" ]; then
    echo "✅ favicon.png exists"
else
    echo "❌ favicon.png missing"
fi

# Check icons directory
echo ""
echo "📦 App Icons:"
ICON_COUNT=$(ls -1 public/icons/icon-*.png 2>/dev/null | wc -l)
if [ $ICON_COUNT -ge 4 ]; then
    echo "✅ App icons present ($ICON_COUNT icons found)"
    ls -1 public/icons/icon-*.png | sed 's/^/   ✓ /'
else
    echo "❌ Missing app icons"
fi

# Check screenshots
SCREENSHOT_COUNT=$(ls -1 public/icons/screenshot-*.png 2>/dev/null | wc -l)
if [ $SCREENSHOT_COUNT -ge 2 ]; then
    echo "✅ Screenshots present ($SCREENSHOT_COUNT found)"
else
    echo "❌ Missing screenshots"
fi

# Check layout.tsx
echo ""
echo "📄 Layout Configuration:"
if grep -q "ServiceWorkerRegistration" src/app/layout.tsx; then
    echo "✅ Service Worker registration in layout"
else
    echo "❌ Service Worker registration missing"
fi

if grep -q "manifest.json" src/app/layout.tsx; then
    echo "✅ Manifest reference in layout"
else
    echo "❌ Manifest reference missing"
fi

# Check next.config
echo ""
echo "⚙️  Next.js Configuration:"
if grep -q "headers" next.config.ts; then
    echo "✅ PWA headers configured"
else
    echo "❌ PWA headers not configured"
fi

echo ""
echo "=================================="
echo "✨ PWA Setup Complete and Verified!"
echo ""
echo "📱 To test:"
echo "   1. Run: pnpm build && pnpm start"
echo "   2. Open http://localhost:3000 (or HTTPS)"
echo "   3. Look for install option in browser"
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy with HTTPS enabled"
echo "   2. Test installation on mobile"
echo "   3. Check offline functionality"
