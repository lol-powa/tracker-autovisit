#!/bin/bash

# install.sh — Installation sur NAS Synology (DSM 7+)
# Lance avec : sudo bash install.sh

set -e

echo "=== Installation autovisit ==="

# 1. Vérification Python3
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 introuvable. Installe-le via le Centre de paquets Synology."
    exit 1
fi
echo "✅ Python3 : $(python3 --version)"

# 2. Installation pip pour root si absent
if ! python3 -m pip --version &>/dev/null; then
    echo "Installation de pip..."
    curl -sS https://bootstrap.pypa.io/pip/3.8/get-pip.py | python3
fi
echo "✅ pip : $(python3 -m pip --version)"

# 3. Installation des dépendances
echo "Installation des dépendances..."
python3 -m pip install requests pyotp curl_cffi --break-system-packages
echo "✅ Dépendances installées"

# 4. Création du fichier sites.json si absent
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/sites.json" ]; then
    echo "Création de sites.json depuis l'exemple..."
    cp "$SCRIPT_DIR/sites.example.json" "$SCRIPT_DIR/sites.json"
    chmod 600 "$SCRIPT_DIR/sites.json"
    echo "✅ sites.json créé — pense à le remplir avec tes identifiants"
else
    echo "✅ sites.json déjà présent"
fi

# 5. Permissions
chmod +x "$SCRIPT_DIR/autovisit.py"

# 6. Commande courte (optionnel)
if [ ! -f /usr/local/bin/autovisit ]; then
    printf '#!/bin/sh\nexec sudo python3 %s/autovisit.py "$@"\n' "$SCRIPT_DIR" > /usr/local/bin/autovisit
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
echo "  1. Edite sites.json avec tes identifiants"
echo "  2. Teste avec : autovisit --verbose"
echo ""
echo "Pour le planificateur DSM (quotidien) :"
echo "  Panneau de configuration → Planificateur de tâches"
echo "  → Créer → Tâche planifiée → Script défini par l'utilisateur"
echo "  Commande : python3 $SCRIPT_DIR/autovisit.py --mp --error"
echo "  Planification : Quotidienne, à l'heure souhaitée"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
