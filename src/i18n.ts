export type Lang = "en" | "ru";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
];

export const DEFAULT_LANG: Lang = "en";

const en = {
  // Sidebar
  settingsTitle: "Settings",
  hidePanel: "Hide panel",
  showPanel: "Show panel",
  playlistPlaceholder: "Playlist link or text...",
  back: "Back",
  searchPlaceholder: "Search...",
  categories: "Categories",
  all: "All",
  allChannels: "All channels",
  favorites: "Favorites",
  nothingFound: "Nothing found",
  noChannels: "No channels",
  myPlaylists: "My playlists",
  rename: "Rename",
  noSavedPlaylists: "No saved playlists",
  saveHint: "Paste a link above — it saves automatically",
  recent: "Recent",

  // Settings panel
  appearance: "Appearance theme",
  language: "Language",
  themeDefault: "Blue",
  themePurple: "Purple",
  themeGreen: "Green",
  themeOrange: "Orange",
  themePink: "Pink",
  themeCustom: "Custom colour",

  // Player
  nowPlaying: "Now",
  debug: "Debug",
  channelInfo: "Channel info",
  labelName: "Name",
  labelGroup: "Group",
  labelLogo: "Logo",
  labelResolution: "Resolution",
  labelCurrentLevel: "Current level",
  labelHlsLevels: "Available HLS levels",
  previous: "Previous",
  next: "Next",
  exitPip: "Exit PiP",
  enterPip: "Picture in picture",
  heroDesc: "Paste an M3U playlist link or a direct stream",
  loading: "Loading...",
  watch: "Watch",

  // Errors
  errorPrefix: "Error: {err}",
  serverNotResponding: "Server is not responding",
  serverTimeout: "Server is not responding (timeout)",
  notFound404: "Channel not found (404)",
  denied403: "Access denied (403)",
  channelUnavailableKind: "Channel unavailable ({kind})",
  channelUnavailable: "Channel unavailable",
  unknownError: "unknown error",
  plainError: "error",
  playbackStartFailed: "Could not start playback",
  streamTimeout: "Timed out — the stream is not responding",
  playbackFailed: "Playback error",

  // Debug log
  debugColdStart: "🧊 Cold start: restarting the channel",
  debugPlayAborted: "🔁 play() interrupted (AbortError) — retrying",
  debugPlayRetryFailed: "❌ Play (retry failed): {err}",
  debugChannel: "▶ Channel: {name}",
  debugUrlOk: "✅ URL is reachable",
  debugUrlTimeout: "⏱️ URL check did not answer in 3s — continuing without it",
  debugUrlError: "⚠️ URL check: {err}",
  debugDirectStream: "📡 Direct stream",
  debugHlsUnsupported: "⚠️ hls.js is not supported",
  debugHlsStart: "🎬 Starting hls.js",
  debugManifestTimeout: "⏰ Manifest timeout",
  debugFallback: "🔄 Falling back to the direct src",
  debugManifestLevels: "📋 Manifest, levels: {n}",
  debugManifestNoLevels: "📋 Manifest (no levels)",
  debugDataReceived: "✅ Data received",
  debugPlaying: "▶ Playing",
  debugBuffering: "⏳ Buffering",
  debugBufferTimeout: "⏰ Buffering timeout",
  debugVideoError: "❌ Video error",
  debugRecovering: "🔄 Recovering",
};

type Dict = typeof en;

const ru: Dict = {
  // Sidebar
  settingsTitle: "Настройки",
  hidePanel: "Скрыть панель",
  showPanel: "Показать панель",
  playlistPlaceholder: "Ссылка или текст плейлиста...",
  back: "Назад",
  searchPlaceholder: "Поиск...",
  categories: "Категории",
  all: "Все",
  allChannels: "Все каналы",
  favorites: "Избранное",
  nothingFound: "Ничего не найдено",
  noChannels: "Нет каналов",
  myPlaylists: "Мои плейлисты",
  rename: "Переименовать",
  noSavedPlaylists: "Нет сохранённых плейлистов",
  saveHint: "Вставьте ссылку выше — сохранится автоматически",
  recent: "Недавние",

  // Settings panel
  appearance: "Тема оформления",
  language: "Язык",
  themeDefault: "Синяя",
  themePurple: "Фиолетовая",
  themeGreen: "Зелёная",
  themeOrange: "Оранжевая",
  themePink: "Розовая",
  themeCustom: "Свой цвет",

  // Player
  nowPlaying: "Сейчас",
  debug: "Отладка",
  channelInfo: "Информация о канале",
  labelName: "Название",
  labelGroup: "Группа",
  labelLogo: "Логотип",
  labelResolution: "Разрешение",
  labelCurrentLevel: "Текущий уровень",
  labelHlsLevels: "Доступные уровни HLS",
  previous: "Предыдущий",
  next: "Следующий",
  exitPip: "Выйти из PiP",
  enterPip: "Картинка в картинке",
  heroDesc: "Вставьте ссылку на M3U плейлист или прямой поток",
  loading: "Загрузка...",
  watch: "Смотреть",

  // Errors
  errorPrefix: "Ошибка: {err}",
  serverNotResponding: "Сервер не отвечает",
  serverTimeout: "Сервер не отвечает (timeout)",
  notFound404: "Канал не найден (404)",
  denied403: "Доступ запрещён (403)",
  channelUnavailableKind: "Канал недоступен ({kind})",
  channelUnavailable: "Канал недоступен",
  unknownError: "неизвестная ошибка",
  plainError: "ошибка",
  playbackStartFailed: "Не удалось запустить воспроизведение",
  streamTimeout: "Таймаут — поток не отвечает",
  playbackFailed: "Ошибка воспроизведения",

  // Debug log
  debugColdStart: "🧊 Холодный старт: авто-перезапуск канала",
  debugPlayAborted: "🔁 play() прерван (AbortError) — повтор",
  debugPlayRetryFailed: "❌ Play (повтор не удался): {err}",
  debugChannel: "▶ Канал: {name}",
  debugUrlOk: "✅ URL доступен",
  debugUrlTimeout: "⏱️ Проверка URL не ответила за 3с — продолжаем без неё",
  debugUrlError: "⚠️ Проверка URL: {err}",
  debugDirectStream: "📡 Прямой поток",
  debugHlsUnsupported: "⚠️ hls.js не поддерживается",
  debugHlsStart: "🎬 Запуск hls.js",
  debugManifestTimeout: "⏰ Таймаут манифеста",
  debugFallback: "🔄 Fallback на прямой src",
  debugManifestLevels: "📋 Манифест, уровней: {n}",
  debugManifestNoLevels: "📋 Манифест (без уровней)",
  debugDataReceived: "✅ Данные получены",
  debugPlaying: "▶ Воспроизведение",
  debugBuffering: "⏳ Буферизация",
  debugBufferTimeout: "⏰ Таймаут буферизации",
  debugVideoError: "❌ Ошибка видео",
  debugRecovering: "🔄 Восстановление",
};

const dictionaries: Record<Lang, Dict> = { en, ru };

export type TranslationKey = keyof Dict;

export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

export function createTranslator(lang: Lang): Translator {
  const dict = dictionaries[lang] ?? dictionaries[DEFAULT_LANG];
  return (key, vars) => {
    let out: string = dict[key] ?? dictionaries.en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        out = out.split(`{${name}}`).join(String(value));
      }
    }
    return out;
  };
}

/** "3 channels" / "3 канала" — English and Russian plural rules differ. */
export function channelCount(lang: Lang, n: number): string {
  if (lang === "ru") {
    const tens = n % 100;
    const ones = n % 10;
    const word =
      ones === 1 && tens !== 11
        ? "канал"
        : ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)
        ? "канала"
        : "каналов";
    return `${n} ${word}`;
  }
  return `${n} ${n === 1 ? "channel" : "channels"}`;
}
