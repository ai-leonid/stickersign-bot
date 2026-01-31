# Модель данных

## Пользователь
- id
- telegramUserId
- username
- createdAt

## Стикерпак
- id
- ownerId
- title
- slug
- telegramPackId
- isCustomButtonEnabled
- createdAt

## Стикер
- id
- packId
- position
- letter
- fileId
- createdAt

## Медиафайл
- id
- type
- storagePath
- hash
- createdAt

## Задача генерации
- id
- packId
- status
- errorMessage
- createdAt
