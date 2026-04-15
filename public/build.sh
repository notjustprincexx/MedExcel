#!/bin/bash
# ─────────────────────────────────────────────
# MedExcel Build Script
# Run this after editing any file in js/views/
# Then deploy with: firebase deploy
# ─────────────────────────────────────────────

echo "Building app.bundle.js..."

cat \
  js/app.js \
  js/referral.js \
  js/upgrade-modal.js \
  js/views/home.js \
  js/views/study.js \
  js/views/create.js \
  js/views/payment.js \
  js/push.js \
  > js/app.bundle.js

echo "Building onboarding.bundle.js..."
cat js/onboarding.js > js/onboarding.bundle.js

echo "✓ Done. Now run: firebase deploy"
