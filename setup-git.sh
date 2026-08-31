#!/bin/bash
set -e
cd /root
# rename folder 0DTE -> hybrid-cash
if [ -d /root/odte-landing ] && [ ! -d /root/hybrid-cash ]; then
  mv /root/odte-landing /root/hybrid-cash
  echo "renamed to /root/hybrid-cash"
fi
cd /root/hybrid-cash
# init git
git init -q 2>/dev/null || true
git config user.email "hybridcash@users.noreply.github.com"
git config user.name "Hybrid Cash"
# ensure no node_modules / secrets
cat > .gitignore <<'EOF'
node_modules/
*.pk
pk.txt
.secrets/
EOF
# stage everything
git add -A
git commit -q -m "Hybrid Cash — prepaid cards funded with crypto on Robinhood Chain ($HCASH)

Landing page (RWA Cash-style structure): nav, hero, how it works,
features, fees, FAQ, CTA, footer. Logo + favicon + og-image in assets/.
Dark terminal theme, neon green/red, responsive, no deps."
echo "--- committed ---"
git log --oneline -1
echo "--- files ---"
git ls-files
