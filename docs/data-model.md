# Модель данных

## Пользователь
- id
- telegramUserId
- username
- createdAt
- settings

## Стикерпак
- id
- ownerId
- title
- slug
- telegramPackId
- isCustomButtonEnabled
- phrase
- gridSize
- stylePresetId
- createdAt

## Стикер
- id
- packId
- position
- letter
- fileId
- isPlaceholder
- createdAt

## Медиафайл
- id
- type
- storagePath
- hash
- size
- createdAt

## Пресет стиля
- id
- name
- fontFamily
- fontSize
- fontColor
- strokeColor
- backgroundColor
- createdAt

## Настройки пользователя
- id
- userId
- stylePresetId
- fontColor
- strokeColor
- createdAt
- updatedAt

## Задача генерации
- id
- packId
- status
- errorMessage
- createdAt
