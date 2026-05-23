# autovisit

Script Python pour visiter automatiquement des sites privés et éviter les désactivations de compte pour inactivité. Permet également de recevoir des alertes en cas de message privé reçu.

Supporte les connexions classiques (form POST), les API JSON, le TOTP (2FA), et les sites protégés par Cloudflare. Notifications via Pushover.

---

## Prérequis

Python 3.8+

```bash
pip install requests pyotp curl_cffi --break-system-packages
```

> `curl_cffi` est nécessaire uniquement pour les sites sous Cloudflare (ex: trackers Nuxt/Next.js). Si tu n'en as pas, le script fonctionne sans.

---

## Installation

```bash
git clone ...
cd autovisit
sudo bash install.sh
```

Le script `install.sh` s'occupe de tout :
- Vérification de Python3
- Installation de pip et des dépendances (`requests`, `pyotp`, `curl_cffi`)
- Copie de `sites.example.json` vers `sites.json`
- Installation de la commande courte `autovisit`

Il ne reste plus qu'à éditer `sites.json` avec tes identifiants.

### Installation manuelle (sans install.sh)

```bash
pip install requests pyotp curl_cffi --break-system-packages
cp sites.example.json sites.json
```

### Commande courte (si install.sh non utilisé)

```bash
printf '#!/bin/sh\nexec sudo python3 /chemin/vers/autovisit.py "$@"\n' > /usr/local/bin/autovisit
chmod 755 /usr/local/bin/autovisit
```

---

## Configuration

Toute la configuration se fait dans `sites.json`.

### Structure générale

```json
{
  "pushover": {
    "api_token": "TON_APP_TOKEN",
    "user_key": "TON_USER_KEY"
  },
  "sites": [
    { ... },
    { ... }
  ]
}
```

### Champs disponibles par site

| Champ | Obligatoire | Description |
|---|---|---|
| `name` | ✅ | Nom du site (utilisé dans les logs et notifications) |
| `url` | ✅ | URL de la page de login (GET initial) |
| `post_url` | ✅ | URL cible du formulaire POST |
| `username_field` | ✅ | Nom du champ username dans le formulaire |
| `password_field` | ✅ | Nom du champ password dans le formulaire |
| `username` | ✅ | Ton identifiant |
| `password` | ✅ | Ton mot de passe |
| `enabled` | | `true` par défaut. Mettre `false` pour désactiver |
| `aliases` | | Noms alternatifs pour `--site` (ex: `["ops", "orpheus"]`) |
| `extra_fields` | | Champs supplémentaires à inclure dans le POST (ex: `{"login": "Log in"}`) |
| `extra_headers` | | Headers HTTP supplémentaires (ex: `{"X-Requested-With": "XMLHttpRequest"}`) |
| `success_url_contains` | | Texte attendu dans l'URL après connexion réussie |
| `success_keywords` | | Mots-clés attendus dans le HTML après connexion (plus fiable) |
| `success_json_field` | | Champ JSON attendu dans la réponse API (ex: `"token"`) |
| `verify_url` | | URL supplémentaire à charger pour vérifier la connexion |
| `alert_keywords` | | Mots-clés déclenchant une alerte Pushover (ex: MP non lus) |
| `totp_secret` | | Secret TOTP base32 pour le 2FA |
| `totp_field` | | Nom du champ TOTP dans le formulaire (défaut: `mfa`) |
| `totp_url` | | URL de la page 2FA (si étape séparée) |
| `api_json` | | `true` si le login se fait via API JSON |
| `use_curl_cffi` | | `true` pour les sites Cloudflare (impersonne Firefox) |
| `pre_visit_urls` | | URLs à charger avant le login (initialisation de session) |

---

## Exemples de configuration

### Site classique (form POST)

```json
{
  "name": "MonSite",
  "url": "https://monsite.com/login",
  "post_url": "https://monsite.com/login",
  "username_field": "username",
  "password_field": "password",
  "success_keywords": ["Déconnexion"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site Gazelle avec TOTP

```json
{
  "name": "monsite",
  "url": "https://monsite.com/login.php",
  "post_url": "https://monsite.com/login.php",
  "username_field": "username",
  "password_field": "password",
  "totp_secret": "SECRET_BASE32",
  "totp_field": "mfa",
  "success_url_contains": "index.php",
  "success_keywords": ["Collages"],
  "alert_keywords": ["message"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site API JSON + Cloudflare (ex: tracker Nuxt/Next.js)

```json
{
  "name": "MonTracker",
  "url": "https://montracker.com/login",
  "pre_visit_urls": ["https://montracker.com/api/settings/public"],
  "post_url": "https://montracker.com/api/auth/login",
  "totp_url": "https://montracker.com/api/auth/mfa/totp",
  "totp_secret": "SECRET_BASE32",
  "username_field": "username",
  "password_field": "password",
  "api_json": true,
  "use_curl_cffi": true,
  "verify_url": "https://montracker.com/",
  "success_keywords": ["Bienvenue"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Site API JSON avec token JWT

```json
{
  "name": "MonTracker",
  "url": "https://montracker.com/login",
  "post_url": "https://api.montracker.com/api/v1/auth/login",
  "username_field": "username",
  "password_field": "password",
  "extra_fields": {"remember_me": true},
  "api_json": true,
  "use_curl_cffi": true,
  "success_json_field": "token",
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

### Login AJAX (réponse vide, vérification sur une autre page)

```json
{
  "name": "MonForum",
  "url": "https://monforum.com/",
  "post_url": "https://monforum.com/includes/login.php?action=login",
  "username_field": "pseudo",
  "password_field": "password",
  "extra_headers": {"X-Requested-With": "XMLHttpRequest"},
  "verify_url": "https://monforum.com/usercp.php",
  "success_keywords": ["bienvenue"],
  "username": "monpseudo",
  "password": "monmotdepasse",
  "enabled": true
}
```

---

## Utilisation

```bash
# Mode par défaut : notifie les erreurs et les alertes MP
autovisit

# Tous les sites, silencieux total
autovisit --silent

# Seulement les erreurs
autovisit --error

# Seulement les alertes MP
autovisit --mp

# Erreurs + alertes MP (identique au mode par défaut)
autovisit --mp --error

# Toutes les notifications (erreurs + MP + succès complet)
autovisit --verbose

# Visiter un seul site
autovisit --site Orpheus
autovisit --site ops

# Visiter plusieurs sites
autovisit --site HDF Orpheus

# Combinaisons
autovisit --site ops --verbose
```

---

## Planification (cron / DSM Task Scheduler)

```bash
python3 /chemin/vers/autovisit.py --mp --error
```

Recommandé : 1 fois par jour, à heure fixe.

---

## Alertes MP

Le champ `alert_keywords` permet de détecter des mots-clés sur la page après connexion et d'envoyer une notification Pushover dédiée. Utile pour surveiller les messages privés non lus.

Exemple : sur un tracker Gazelle, `"alert_keywords": ["message"]` détecte la bannière "You have a new message".

La notification reçue aura le titre **"Autovisit - MP"** et le corps **"MP non lu sur NomDuSite"**.

---

## Sécurité

- `sites.json` contient tes mots de passe en clair — protège-le : `chmod 600 sites.json`
- Ne partage jamais ton `sites.json`
- Les secrets TOTP sont également dans ce fichier — traite-le comme un fichier de credentials sensible
