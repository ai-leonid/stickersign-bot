# Обзор проекта

Проект — телеграм-бот на NestJS, который создаёт стикерпак из букв, введённых пользователем. Основная идея — сформировать первые 25 стикеров набора так, чтобы в окне добавления стикеров (сетке 5x5) складывалось читаемое предложение.

## Технологический стек
- NestJS 11, Node.js 20+, TypeScript
- Telegram: grammy
- PostgreSQL + Prisma ORM
- Очереди: bullmq, @nestjs/bullmq, ioredis
- Генерация изображений: @napi-rs/canvas, sharp
- Логи: pino, nestjs-pino
- Конфигурация и валидация: @nestjs/config, class-validator, class-transformer

## Зафиксированные версии
- Node.js 20.11.1
- NestJS 11.0.1
- TypeScript 5.7.3

## Зависимости и назначение
### Runtime
| Пакет | Назначение |
| --- | --- |
| @nestjs/common | базовые декораторы и DI |
| @nestjs/core | ядро приложения NestJS |
| @nestjs/platform-express | HTTP-платформа |
| rxjs | реактивные потоки в NestJS |
| reflect-metadata | метаданные для декораторов |
| grammy | Telegram Bot API |
| prisma | генерация клиента и миграции |
| @prisma/client | клиент БД |
| @nestjs/config | загрузка конфигурации из окружения |
| class-validator | валидация DTO |
| class-transformer | трансформации DTO |
| bullmq | очереди задач |
| @nestjs/bullmq | интеграция bullmq с NestJS |
| ioredis | клиент Redis |
| @napi-rs/canvas | рендер символов в canvas |
| sharp | ресайз и конвертация изображений |
| pino | логирование |
| nestjs-pino | интеграция pino с NestJS |
| nanoid | генерация коротких идентификаторов |
| @aws-sdk/client-s3 | опциональное S3-хранилище |

### Dev
| Пакет | Назначение |
| --- | --- |
| @nestjs/cli | генерация и сборка |
| @nestjs/schematics | схемы NestJS |
| @nestjs/testing | тестовый модуль |
| typescript | компиляция TypeScript |
| ts-node | запуск TypeScript в dev |
| ts-jest | интеграция Jest и TypeScript |
| tsconfig-paths | алиасы путей |
| @types/node | типы Node.js |
| @types/jest | типы Jest |
| @types/express | типы Express |
| @types/supertest | типы Supertest |
| jest | тест-раннер |
| supertest | HTTP-тесты |
| eslint | линтинг |
| prettier | форматирование |
| eslint-config-prettier | согласование eslint и prettier |
| eslint-plugin-prettier | запуск prettier через eslint |
| source-map-support | трассировка ошибок |

## Структура проекта
```
src/
  modules/
    bot/
    packs/
    stickers/
    media/
    users/
    jobs/
  common/
  infrastructure/
prisma/
```

## Ключевые цели
- Генерация стикеров по буквам из пользовательской фразы
- Формирование порядка стикеров в наборе для отображения 5x5
- Поддержка пользовательского «кнопка-стикера» (кастомная картинка)
- Удобный сценарий создания набора через команды бота

## Сценарии пользователя
- Создать набор из фразы, например: «пошли танцы»
- Получить стикерпак, где 25 первых элементов образуют фразу в 5x5
- Добавить кастомную картинку-«кнопку» и использовать её для открытия окна добавления стикеров
