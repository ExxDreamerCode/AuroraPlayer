# ◉ Aurora Player

Нативный IPTV плеер для Windows с минималистичным дизайном.  
Rust + Tauri + React + hls.js.

## Возможности

- **Автоопределение** — вставьте ссылку на M3U плейлист (загрузит все каналы) или на прямой поток (создаст один канал)
- **Парсинг M3U** — извлекает название канала, логотип (tvg-logo), группу (group-title)
- **Воспроизведение** — HLS (.m3u8) через hls.js с fallback на прямую вставку URL
- **Группы** — фильтрация каналов по группам из плейлиста
- **Поиск** — быстрый поиск по названиям каналов
- **Избранное** — ★ добавляйте каналы в избранное
- **История** — последние 20 просмотренных каналов
- **Автосохранение** — плейлисты сохраняются в localStorage и не теряются после перезапуска

## Установка

### Готовый бинарник

```
aurora-player\src-tauri\target\release\aurora-player.exe
```

Или установщик:

```
aurora-player\src-tauri\target\release\bundle\nsis\Aurora Player_0.1.0_x64-setup.exe
```

### Сборка из исходников

```bash
cd aurora-player
npm run tauri build
```

### Режим разработки

```bash
npm run tauri dev
```

## Технологии

| Слой | Технология |
|------|-----------|
| Окно | Tauri 2 + WebView2 |
| Бэкенд | Rust (reqwest, serde) |
| Фронтенд | React 19 + TypeScript |
| Сборка | Vite |
| Видео | hls.js + HTML5 Video |

## Лицензия

MIT LICENSE