#!/bin/bash
set -e

APP_ROLE="${APP_ROLE:-api}"

wait_for() {
  local host="$1"
  local port="$2"
  local label="$3"
  echo "Waiting for $label ($host:$port)..."
  until nc -z "$host" "$port" 2>/dev/null; do
    sleep 1
  done
  echo "$label is ready."
}

# Parse hosts from env
DB_HOST=$(echo "${DATABASE_URL}" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "${DATABASE_URL}" | sed -E 's|.*:([0-9]+)/.*|\1|')
REDIS_HOST=$(echo "${REDIS_URL}" | sed -E 's|redis://([^:/]+).*|\1|')
REDIS_PORT=$(echo "${REDIS_URL}" | sed -E 's|redis://[^:]+:([0-9]+).*|\1|')

wait_for "${DB_HOST:-localhost}" "${DB_PORT:-5432}" "PostgreSQL"
wait_for "${REDIS_HOST:-localhost}" "${REDIS_PORT:-6379}" "Redis"

if [ "$APP_ROLE" = "api" ]; then
  echo "Running Alembic migrations..."
  #alembic upgrade head DEAKTIV

  echo "Starting API server..."
  exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${UVICORN_WORKERS:-2}" \
    --loop uvloop \
    --http httptools

elif [ "$APP_ROLE" = "worker" ]; then
  echo "Starting Celery worker..."
  exec celery -A app.workers.celery_app worker \
    --loglevel=info \
    --concurrency="${CELERY_CONCURRENCY:-4}" \
    -Q sitemap,crawl,indexing,verification,ads

elif [ "$APP_ROLE" = "beat" ]; then
  echo "Starting Celery beat..."
  exec celery -A app.workers.celery_app beat \
    --loglevel=info \
    --scheduler celery.beat:PersistentScheduler

else
  echo "Unknown APP_ROLE: $APP_ROLE"
  exit 1
fi

