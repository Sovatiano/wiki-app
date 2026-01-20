# Этап сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Аргументы для переменных окружения во время сборки
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Продакшн этап с nginx
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
