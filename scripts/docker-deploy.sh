#!/usr/bin/env bash
# Déploiement Docker EC2 — charge .env.production pour le build ET le runtime.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier introuvable : $ENV_FILE"
  echo "Copiez .env.production.example vers .env.production et renseignez les valeurs."
  exit 1
fi

echo "==> Build (env: $ENV_FILE)"
docker compose --env-file "$ENV_FILE" build --no-cache amana

echo "==> Up"
docker compose --env-file "$ENV_FILE" up -d amana

echo "==> OK — logs: docker compose logs -f amana"
