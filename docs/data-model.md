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
- fontFamily
- fontSize
- fontColor
- strokeColor
- backgroundColor
- createdAt

## Задача генерации
- id
- packId
- status
- errorMessage
- createdAt
