# Деплой и окружения

## Схема конфигурации окружения
| Переменная | Обязательна | Назначение | Пример |
| --- | --- | --- | --- |
| TELEGRAM_BOT_TOKEN | да | токен бота Telegram | 123456:ABCDEF |
| TELEGRAM_BOT_NAME | да | username бота | stickersign_bot |
| DATABASE_URL | да | подключение к PostgreSQL | postgresql://postgres:postgres@localhost:5432/stickersign-bot?schema=public |
| STORAGE_PATH | нет | путь для локального хранения | ./storage |
| REDIS_URL | нет | подключение к Redis | redis://localhost:6379 |
| S3_ENDPOINT | нет | endpoint S3 | http://localhost:9000 |
| S3_BUCKET | нет | имя bucket | tg-stickersign |
| S3_REGION | нет | регион S3 | us-east-1 |
| S3_ACCESS_KEY | нет | ключ доступа S3 | minioadmin |
| S3_SECRET_KEY | нет | секрет S3 | minioadmin |

## Хранилище изображений
- По умолчанию используется локальная файловая система и STORAGE_PATH
- При наличии S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY используется S3

## Мониторинг
- Логи ошибок Telegram API
- Метрики времени генерации стикеров
- Метрики очередей bullmq

## Docker Compose
- Локальные сервисы: PostgreSQL и Redis
- Рекомендуемый файл: docker-compose.yml в корне проекта
