# AppTochite — Дизайн-система v0.4

**Версия:** 0.4 · Апрель 2026  
**Тема:** Dark-first  
**Платформа:** PWA · Android  

---

## 1. Цветовая палитра

### Фоны

| Токен | Значение | Применение |
|---|---|---|
| `--bg-100` | `#0F0F11` | Базовый фон приложения |
| `--bg-200` | `#16161A` | Карточки, нижняя навигация |
| `--bg-300` | `#1E1E24` | Вложенные элементы, поля ввода |
| `--bg-400` | `#27272F` | Чипы, теги, кнопки secondary |

### Границы

| Токен | Значение | Применение |
|---|---|---|
| `--border-100` | `#2E2E38` | Тихая граница (карточки, разделители) |
| `--border-200` | `#3D3D4A` | Видимая граница (hover, активные элементы) |

### Текст

| Токен | Значение | Применение |
|---|---|---|
| `--text-100` | `#F2F2F5` | Основной текст |
| `--text-200` | `#B8B8C8` | Вторичный текст |
| `--text-300` | `#72728A` | Третичный, метки секций |
| `--text-400` | `#4A4A60` | Placeholder, disabled |

### Акцент — стальной синий

Цвет выбран как инструментальный и точный — отражает профессию заточника.

| Токен | Значение | Применение |
|---|---|---|
| `--accent` | `#4A90D9` | Кнопки primary, активные состояния, иконки |
| `--accent-light` | `#6AAAE8` | Текст на тёмных акцентных фонах |
| `--accent-dim` | `#1E3A5F` | Акцентный фон (аватары, активные чипы) |

### Статусы

| Токен | Значение | Применение |
|---|---|---|
| `--status-accepted` | `#4A90D9` | Текст пилюли «принят» |
| `--status-accepted-bg` | `#1A2E45` | Фон пилюли «принят» |
| `--status-done` | `#3DB87A` | Текст пилюли «готов» |
| `--status-done-bg` | `#0F2E1E` | Фон пилюли «готов» |

### Опасные действия

| Токен | Значение | Применение |
|---|---|---|
| `--danger` | `#E05555` | Текст кнопок удаления, destructive actions |
| `--danger-dim` | `#3A1515` | Фон кнопок с danger-вариантом |

---

## 2. Типографика

### Гарнитуры

**Display — Bebas Neue**  
Применение: заголовки экранов, числовые метрики (заточки, выручка), названия ножей и брендов в аппбаре, счётчики в строках клиентов.  
Характер: конденсированная, профессиональная, инструментальная.

**Body — Golos Text**  
Применение: весь кириллический контент — имена, комментарии, поля форм, подписи, кнопки, чипы, метки.  
Характер: читаемая, современная, нейтральная.

```
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Golos+Text:wght@400;600;700&display=swap');
```

### Шкала размеров

| Размер | Гарнитура | Вес | Применение |
|---|---|---|---|
| 48px | Bebas Neue | 400 | Главные метрики (заточек всего) |
| 32px | Bebas Neue | 400 | Суммарная выручка |
| 24px | Bebas Neue | 400 | Названия вкладок в аппбаре |
| 20px | Bebas Neue | 400 | Подзаголовок аппбара, группировка по месяцам |
| 17px | Golos Text | 600 | Имя клиента, заголовок карточки |
| 15px | Golos Text | 400 | Основной текст, значения полей |
| 13px | Golos Text | 400 | Вторичная информация, метки форм |
| 12px | Golos Text | 400 | Теги, чипы, статус-пилюли |
| 11px | Golos Text | 600 | Лейблы секций (UPPERCASE + letter-spacing: 2px) |

---

## 3. Скругления

| Токен | Значение | Применение |
|---|---|---|
| `--radius-sm` | `6px` | Теги камней, внутренние элементы |
| `--radius-md` | `10px` | Поля ввода, кнопки, чипы, toast |
| `--radius-lg` | `16px` | Карточки клиентов и заточек |
| `--radius-xl` | `24px` | Bottom sheet (`PhotoSourceSheet`), крупные модальные |
| `--radius-full` | `9999px` | Аватары, статус-пилюли, фильтр-чипы |

---

## 4. Отступы

Шкала: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48px

| Токен | Значение | Применение |
|---|---|---|
| `--space-1` | `4px` | Зазоры между иконкой и текстом |
| `--space-2` | `8px` | Внутренние отступы чипов, тегов |
| `--space-3` | `12px` | Горизонтальный паддинг кнопок small |
| `--space-4` | `16px` | Паддинг карточек, основной отступ |
| `--space-5` | `20px` | Паддинг секций |
| `--space-6` | `24px` | Расстояние между блоками |
| `--space-8` | `32px` | Разделители между секциями |
| `--space-10` | `40px` | Отступ от низа экрана над навигацией |

---

## 5. Компоненты

### Статус-пилюля

```
border-radius: var(--radius-full)
padding: 3px 10px
font-family: var(--font-body)
font-size: 12px
font-weight: 600
letter-spacing: 0.3px
```

Состояния: **принят** (синий), **готов** (зелёный). Статус «в работе» удалён из системы.  
Фоновый цвет — всегда соответствующий `*-bg` токен.

---

### Аватар клиента

```
width / height: 40px (список), 48px (карточка)
border-radius: var(--radius-full)
background: var(--accent-dim)
border: 1px solid var(--accent)
color: var(--accent-light)
font-family: var(--font-body)
font-weight: 700
font-size: 35% от размера аватара
```

Нулевой клиент «Я» — тот же компонент + золотая корона (SVG) в правом нижнем углу аватара.

---

### Кнопки

**Primary**
```
background: var(--accent)
color: #fff
border-radius: var(--radius-md)
padding: 10px 20px
font-weight: 600
```

**Secondary**
```
background: var(--bg-400)
color: var(--text-100)
border: 1px solid var(--border-200)
```

**Danger (с фоном)**
```
background: var(--danger-dim)
color: var(--danger)
border: 1px solid var(--danger)
```

**Ghost (тихая ссылка)**
```
background: transparent
color: var(--danger)
border: none
```
Применяется для «Удалить клиента» и «Удалить заточку» в нижней части экранов.

---

### Карточка / строка

```
background: var(--bg-200)
border: 1px solid var(--border-100)
border-radius: var(--radius-lg)
padding: 16px
```

Hover / press: `border-color: var(--border-200)`

---

### Поле ввода

```
background: var(--bg-300)
border: 1px solid var(--border-100)
border-radius: var(--radius-md)
padding: 10px 12px
font-family: var(--font-body)
font-size: 15px
color: var(--text-100)
```

Активное / фокус: `border-color: var(--accent)`  
Placeholder: `color: var(--text-400)`

Лейбл над полем:
```
font-size: 11px
font-weight: 600
text-transform: uppercase
letter-spacing: 2px
color: var(--text-300)
margin-bottom: 4px
```

---

### Чипы фильтра

```
border-radius: var(--radius-full)
padding: 4px 12px
font-size: 12px
font-family: var(--font-body)
```

Неактивный: `bg: var(--bg-400)`, `color: var(--text-200)`, `border: var(--border-100)`  
Активный: `bg: var(--accent-dim)`, `color: var(--accent-light)`, `border: var(--accent)`

---

### Тег камня

```
background: var(--bg-400)
border: 1px solid var(--border-200)
border-radius: var(--radius-sm)
padding: 3px 9px
font-size: 12px
color: var(--text-200)
```

Порядковый номер: `color: var(--text-400)`, `font-size: 10px`  
Крестик удаления: `color: var(--text-400)`, `font-size: 14px`

---

### Toast-уведомление

```
background: var(--bg-400)
border: 1px solid var(--border-200)
border-radius: var(--radius-md)
padding: 10px 16px
font-size: 13px
color: var(--text-100)
box-shadow: 0 8px 24px rgba(0,0,0,0.5)
```

Позиционирование: `bottom: 24px`, центр по горизонтали.  
Автоскрытие через 2–3 секунды.

---

### Нижняя навигация

```
background: var(--bg-200)
border-top: 1px solid var(--border-100)
height: 56px
```

Неактивная вкладка: `color: var(--text-300)`  
Активная вкладка: `color: var(--accent)`, `border-bottom: 2px solid var(--accent)`

### FAB — плавающая кнопка «+ Заточка»

Кнопка фиксирована в правом нижнем углу поверх контента (Material Design FAB).

```
position: fixed
bottom: 72px          /* выше нижней навигации */
right: 16px
background: var(--accent)
color: #fff
border-radius: var(--radius-full)
width: 56px
height: 56px
box-shadow: 0 4px 16px rgba(74, 144, 217, 0.4)
```

SVG-иконка «+» внутри. При нажатии из карточки клиента (C-2) предзаполняет поле клиента в форме заточки и скрывает его.

---

### Пунктирная кнопка добавления

```
border: 1px dashed var(--border-200)
border-radius: var(--radius-lg)
padding: 12px 16px
color: var(--text-300)
font-size: 14px
```

Иконка «+»: `color: var(--accent)`, `font-size: 18px`

---

## 6. CSS-переменные (полный блок)

```css
:root {
  /* Backgrounds */
  --bg-100: #0F0F11;
  --bg-200: #16161A;
  --bg-300: #1E1E24;
  --bg-400: #27272F;

  /* Borders */
  --border-100: #2E2E38;
  --border-200: #3D3D4A;

  /* Text */
  --text-100: #F2F2F5;
  --text-200: #B8B8C8;
  --text-300: #72728A;
  --text-400: #4A4A60;

  /* Accent — steel blue */
  --accent: #4A90D9;
  --accent-light: #6AAAE8;
  --accent-dim: #1E3A5F;

  /* Status */
  --status-accepted: #4A90D9;
  --status-accepted-bg: #1A2E45;
  --status-done: #3DB87A;
  --status-done-bg: #0F2E1E;

  /* Danger */
  --danger: #E05555;
  --danger-dim: #3A1515;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Fonts */
  --font-display: 'Bebas Neue', 'Arial Narrow', sans-serif;
  --font-body: 'Golos Text', 'Segoe UI', sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

---

## 7. Технический стек

| Слой | Технология | Обоснование |
|---|---|---|
| Фреймворк | React + Vite | Стандарт для PWA, быстрая сборка |
| Язык | TypeScript | Типизация компонентов и схем Dexie |
| Стилизация | **CSS Modules** | Токены дизайн-системы в `tokens.css`, изоляция стилей по компонентам |
| Навигация | React Router | SPA-навигация, deep links |
| Хранилище | Dexie.js (IndexedDB) | Клиенты, заточки, справочники, фото в base64 |
| Офлайн | Workbox | Service Worker, кэширование, PWA manifest |
| Камера | Web Camera API | Съёмка фото «до» и «после» |
| Деплой | **GitHub Pages** (CI через GitHub Actions, Node 24) | |

### Структура стилей

```
src/
  styles/
    tokens.css        ← все CSS custom properties (:root)
    reset.css         ← базовый сброс
  components/
    ClientCard/
      ClientCard.tsx
      ClientCard.module.css   ← импортирует токены через var(--...)
    StatusPill/
      StatusPill.tsx
      StatusPill.module.css
```

Токены подключаются глобально в `main.tsx`:

```ts
import './styles/tokens.css';
import './styles/reset.css';
```

Компоненты используют токены напрямую:

```css
/* ClientCard.module.css */
.card {
  background: var(--bg-200);
  border: 1px solid var(--border-100);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

---

## Changelog

**v0.4 (апрель 2026) — актуализация по реализованным изменениям:**

- Удалены токены `--status-inwork` и `--status-inwork-bg` — статус «в работе» удалён из системы
- Добавлен токен `--radius-full: 9999px` в таблицу и CSS-блок (был в `tokens.css`, отсутствовал в документации)
- Статус-пилюля: убран вариант «в работе», теперь только 2 состояния
- FAB выделен в отдельный компонент: `position: fixed`, отдельно от нижней навигации
- Аватар нулевого клиента «Я»: добавлена золотая корона (SVG)
- Деплой: Vercel → GitHub Pages
- Добавлено описание `PhotoSourceSheet` (bottom sheet выбора источника фото)

**v0.3** — первая версия дизайн-системы. Зафиксированы цвета, типографика, токены, компоненты на основе вайрфреймов из функциональной спецификации v0.3.
