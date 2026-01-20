#!/bin/bash
set -e

echo "Waiting for database to be ready..."
# Ждем пока база данных станет доступной
until pg_isready -h db -U postgres; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is ready! Running migrations..."
# Запускаем миграции
alembic upgrade head

echo "Starting server..."
# Запускаем сервер
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
