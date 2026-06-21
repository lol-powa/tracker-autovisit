#!/bin/bash
# install.sh — Installation sur Debian stable
# Lance avec : bash install.sh (en root)
set -e
echo "=== Installation autovisit ==="
# 1. Vérification Python3
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 introuvable. Installe-le avec : apt install python3 python3-pip"
    exit 1
fi
echo "✅ Python3 : $(python3 --version)"
# 2. Installation pip pour root si absent
if ! python3 -m pip --version &>/dev/null; then
    echo "Installation de pip..."
    apt install -y python3-pip
fi
echo "✅ pip : $(python3 -m pip --version)"
# 3. Installation des dépendances
echo "Installation des dépendances..."
python3 -m pip install requests pyotp curl_cffi --break-system-packages
echo "✅ Dépendances installées"
# 4. Installation optionnelle de Playwright
echo ""
read -r -p "Installer Playwright + Firefox headless (pour les sites avec captcha invisible) ? [o/N] " answer
if [[ "$answer" =~ ^[oOyY]$ ]]; then
    python3 -m pip install playwright --break-system-packages
    playwright install firefox
    echo "✅ Playwright + Firefox installés"
else
    echo "⏭  Playwright ignoré"
fi
# 4b. Note FlareSolverr (installation manuelle requise)
echo ""
echo "ℹ  FlareSolverr (optionnel) : requis pour les sites avec challenge Cloudflare"
echo "   non franchi par Playwright. Installation manuelle, par ex. via Docker :"
echo "     docker run -d --name flaresolverr --restart unless-stopped \\"
echo "       -p 127.0.0.1:8191:8191 ghcr.io/flaresolverr/flaresolverr:latest"
echo "   Puis renseigner \"cf_solver\": \"http://127.0.0.1:8191/v1\" dans les sites concernés."
# 5. Création de l'arborescence de config si absente
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$SCRIPT_DIR/data" "$SCRIPT_DIR/data/logs" "$SCRIPT_DIR/data/cookies" "$SCRIPT_DIR/data/sites.d"
if [ ! -f "$SCRIPT_DIR/data/config.json" ]; then
    echo "Création de data/config.json (config globale)..."
    cat > "$SCRIPT_DIR/data/config.json" <<'JSONEOF'
{
    "mail": {
        "enabled": true,
        "to": "autovisit@example.org"
    },
    "ntfy": {
        "enabled": true,
        "url": "https://ntfy.example.org",
        "topic": "autovisit",
        "auth_user": "autovisit",
        "auth_pass": "CHANGE_ME",
        "priority": 4,
        "tags": "warning"
    }
}
JSONEOF
    chmod 600 "$SCRIPT_DIR/data/config.json"
    echo "✅ data/config.json créé — pense à le remplir"
else
    echo "✅ data/config.json déjà présent"
fi
echo "ℹ  Ajoute un fichier par site dans data/sites.d/ (ex. data/sites.d/hdf.json)"
# 6. Permissions
chmod +x "$SCRIPT_DIR/autovisit.py"
# 7. Déploiement web (optionnel)
read -r -p "Déployer la page web vers /var/www/autovisit/ ? [o/N] " answer
if [[ "$answer" =~ ^[oOyY]$ ]]; then
    mkdir -p /var/www/autovisit/icones
    cp "$SCRIPT_DIR/web/index.html" /var/www/autovisit/
    cp "$SCRIPT_DIR/web/icones/"* /var/www/autovisit/icones/
    chown -R www-data:www-data /var/www/autovisit
    echo "✅ Page web déployée dans /var/www/autovisit/"
else
    echo "⏭  Déploiement web ignoré"
fi
# 8. Commande courte (optionnel)
if [ ! -f /usr/local/bin/autovisit ]; then
    printf '#!/bin/sh\nexec python3 %s/autovisit.py "$@"\n' "$SCRIPT_DIR" > /usr/local/bin/autovisit
    chmod 755 /usr/local/bin/autovisit
    echo "✅ Commande 'autovisit' installée"
else
    echo "✅ Commande 'autovisit' déjà présente"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installation terminée !"
echo ""
echo "PROCHAINES ÉTAPES :"
echo "  1. Edite data/config.json et ajoute tes sites dans data/sites.d/"
echo "  2. Teste avec : autovisit --verbose"
echo ""
echo "Pour cron quotidien :"
echo "  crontab -e"
echo "  0 6 * * * $SCRIPT_DIR/autovisit.py --json-output >> $SCRIPT_DIR/data/logs/cron.log 2>&1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
