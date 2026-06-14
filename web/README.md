# Interface web Autovisit

Page statique qui lit `status.json` généré par `autovisit --json-output`
et affiche les stats de tous les sites configurés.

## Déploiement

```bash
mkdir -p /var/www/autovisit
cp web/index.html /var/www/autovisit/
```

Configurer un cron pour générer `status.json` à côté :

```cron
0 */6 * * * (/usr/local/bin/autovisit --json-output && cp /root/tracker-autovisit/data/status.json /var/www/autovisit/) >> /var/log/autovisit.log 2>&1
```

Servir `/var/www/autovisit/` via Nginx.
