#!/usr/bin/env bash
set -Eeuo pipefail
set -m

for name in MYSQL_ROOT_PASSWORD MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD DB_NAME DB_USER DB_PASSWORD; do
  if [[ -z "${!name:-}" ]]; then
    echo "$name ausente; confira o Environment Group da Render." >&2
    exit 1
  fi
done

if [[ "$DB_NAME" != "$MYSQL_DATABASE" || "$DB_USER" != "$MYSQL_USER" || "$DB_PASSWORD" != "$MYSQL_PASSWORD" ]]; then
  echo 'As variáveis DB_* e MYSQL_* não correspondem.' >&2
  exit 1
fi

docker-entrypoint.sh mysqld \
  --bind-address=127.0.0.1 \
  --mysqlx=OFF \
  --innodb-buffer-pool-size=32M \
  --innodb-buffer-pool-chunk-size=32M \
  --innodb-log-buffer-size=8M \
  --performance-schema=OFF \
  --max-connections=20 \
  --table-open-cache=128 &
mysql_pid=$!

stop_services() {
  trap - TERM INT
  kill -TERM -- "-$api_pid" "-$mysql_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
  wait "$mysql_pid" 2>/dev/null || true
}

trap 'stop_services; exit 143' TERM
trap 'stop_services; exit 130' INT

npm start &
api_pid=$!

if wait -n "$mysql_pid" "$api_pid"; then
  status=0
else
  status=$?
fi

stop_services
exit "$status"
