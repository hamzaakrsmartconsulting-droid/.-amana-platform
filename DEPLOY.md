# DEPLOY.md — Déploiement AMANA Patrimoine sur AWS EC2

Guide opérationnel pour faire tourner la plateforme sur une instance EC2
(Ubuntu 22.04+) en Docker derrière Nginx + TLS Let's Encrypt.

Cible : `https://platform.amana-patrimoine.fr`.

---

## 1. Pré-requis sur l'EC2

- Ubuntu 22.04 LTS (ou 26.04), t3.medium minimum (2 vCPU / 4 Go RAM)
- Elastic IP attachée + `A platform.amana-patrimoine.fr → <Elastic IP>`
- Security Group inbound : 22 (IP fixe), 80, 443 (0.0.0.0/0)
- Outils installés : `docker`, `docker compose`, `nginx`, `certbot`, `git`, `ufw`

Vérifier :

```bash
docker --version && docker compose version && nginx -v && certbot --version
```

## 2. Récupérer le code

```bash
sudo mkdir -p /var/www/amana && sudo chown $USER:$USER /var/www/amana
cd /var/www/amana
# Adapte l'URL au remote utilisé (clé SSH GitHub ou HTTPS + token)
git clone git@github.com:hamzaakrsmartconsulting-droid/.-amana-platform.git .
git checkout main
```

## 3. Configurer `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

**Tout ce qui est marqué `[OBLIGATOIRE]` doit être rempli.** Notamment :

- `SUPABASE_SERVICE_ROLE_KEY` (JWT `service_role`, pas la `secret key`)
- `ANTHROPIC_API_KEY` (clé prod dédiée)
- `AMANA_INTERNAL_SECRET` et `CRON_SECRET` (générer : `openssl rand -hex 32`)
- `YOUSIGN_API_KEY` (clé PROD, pas sandbox)
- `RESEND_API_KEY` (domaine vérifié SPF/DKIM côté Resend)

Sécuriser les droits :

```bash
chmod 600 .env.production
```

## 4. Build & démarrage du container

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose ps           # amana doit être "healthy" après ~30s
docker compose logs -f amana
```

Test interne (depuis l'EC2) :

```bash
curl -s http://127.0.0.1:3000/api/health | jq
# {"status":"ok","service":"amana-platform",...}
```

## 5. Nginx reverse proxy + HTTPS

Créer `/etc/nginx/sites-available/amana` :

```nginx
server {
  listen 80;
  server_name platform.amana-patrimoine.fr;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name platform.amana-patrimoine.fr;

  ssl_certificate     /etc/letsencrypt/live/platform.amana-patrimoine.fr/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/platform.amana-patrimoine.fr/privkey.pem;

  client_max_body_size 25M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_read_timeout 120s;   # agents IA (tool use loop) jusqu'à ~90s
  }
}
```

Activer + TLS :

```bash
sudo ln -sf /etc/nginx/sites-available/amana /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d platform.amana-patrimoine.fr
sudo systemctl reload nginx
```

## 6. Crons

Les crons sont gérés par le sidecar `cron` du `docker-compose.yml` (lit
`CRON_SECRET` + `NEXT_PUBLIC_APP_URL` depuis `.env.production`).

Vérifier le sidecar :

```bash
docker compose logs cron
docker exec amana-cron cat /etc/crontabs/root
```

Test manuel d'une route cron :

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://platform.amana-patrimoine.fr/api/cron/bilan-annuel
```

## 7. Webhook Yousign

Côté dashboard Yousign **prod** :

- URL : `https://platform.amana-patrimoine.fr/api/webhooks/yousign`
  (et/ou `/api/signature/webhook` selon la config)
- Secret HMAC : doit correspondre à `YOUSIGN_WEBHOOK_SECRET` du `.env.production`

## 8. Côté Supabase (à faire UNE fois)

Dans le projet Supabase prod → **Authentication → URL Configuration** :

- Site URL : `https://platform.amana-patrimoine.fr`
- Redirect URLs : ajouter `https://platform.amana-patrimoine.fr/**`

Sinon les magic links / reset password partent vers localhost.

## 9. Mises à jour ultérieures

```bash
cd /var/www/amana
git pull origin main
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker image prune -f
```

Le container redémarre tout seul (`restart: unless-stopped`).

## 10. Sanity checks production

```bash
# 1. Container healthy
docker compose ps

# 2. Healthcheck public
curl -I https://platform.amana-patrimoine.fr/api/health

# 3. Cert TLS valide
curl -vI https://platform.amana-patrimoine.fr 2>&1 | grep -E '^(HTTP|< server|< strict)'

# 4. Aucune variable dev / sandbox / ngrok / localhost ne fuit dans l'env
docker exec amana sh -c "env | grep -Ei '(ngrok|localhost|sandbox|dev_bypass|dev_mock|dev_instant)'"
# → doit retourner vide

# 5. Auth Supabase ne bypasse pas
docker exec amana sh -c 'echo "DEV_BYPASS_AUTH=$DEV_BYPASS_AUTH NODE_ENV=$NODE_ENV"'
# → DEV_BYPASS_AUTH= (vide ou 0) NODE_ENV=production
```

## 11. Logs & monitoring

```bash
docker compose logs -f amana          # logs app Next.js
docker compose logs -f cron           # logs sidecar cron
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
docker stats amana                    # CPU/RAM en temps réel
```

## 12. Rollback rapide

```bash
cd /var/www/amana
git log --oneline -5
git checkout <sha-stable>
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

---

## Annexe — Pièges fréquents

| Symptôme | Cause | Fix |
|---|---|---|
| `next: not found` au build | `output: "standalone"` manquant dans `next.config.ts` | Vérifier la config |
| ORIAS affiché `00000000` côté client | `NEXT_PUBLIC_*` non passé en `--build-arg` | Re-build avec les args |
| Webhook Yousign 401 | `YOUSIGN_WEBHOOK_SECRET` ≠ celui du dashboard | Resynchroniser |
| Magic link vers localhost | Site URL pas configurée côté Supabase | Cf. §8 |
| Container OOM-killed | Génération PDF + pic Anthropic | Passer t3.large ou augmenter `mem_limit` |
| Cron silencieux | `CRON_SECRET` absent dans `.env.production` | Le sidecar logge l'erreur 401 |
