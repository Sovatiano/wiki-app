FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копирование файлов зависимостей
COPY requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода приложения
COPY . .

# Переменные окружения по умолчанию
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Порт для FastAPI
EXPOSE 8000

# Команда для запуска приложения (inline для надежности)
CMD ["sh", "-c", "until pg_isready -h db -U postgres; do echo 'Waiting for database...'; sleep 1; done && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
