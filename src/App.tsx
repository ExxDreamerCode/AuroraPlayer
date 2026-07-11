import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import Hls from "hls.js";
import "./App.css";

interface Channel {
  name: string;
  url: string;
  logo: string | null;
  group: string | null;
}

interface Playlist {
  channels: Channel[];
  name: string;
}

interface Theme {
  name: string;
  accent: string;
  accentSoft: string;
  accentDim: string;
  bgDeep: string;
  label: string;
}

const THEMES: Theme[] = [
  { name: "default", accent: "#0a84ff", accentSoft: "rgba(10, 132, 255, 0.35)", accentDim: "rgba(10, 132, 255, 0.14)", bgDeep: "#060608", label: "Синяя" },
  { name: "purple", accent: "#a855f7", accentSoft: "rgba(168, 85, 247, 0.35)", accentDim: "rgba(168, 85, 247, 0.14)", bgDeep: "#0a0a12", label: "Фиолетовая" },
  { name: "green", accent: "#22c55e", accentSoft: "rgba(34, 197, 94, 0.35)", accentDim: "rgba(34, 197, 94, 0.14)", bgDeep: "#060a08", label: "Зелёная" },
  { name: "orange", accent: "#f97316", accentSoft: "rgba(249, 115, 22, 0.35)", accentDim: "rgba(249, 115, 22, 0.14)", bgDeep: "#0a0806", label: "Оранжевая" },
  { name: "pink", accent: "#ec4899", accentSoft: "rgba(236, 72, 153, 0.35)", accentDim: "rgba(236, 72, 153, 0.14)", bgDeep: "#0a0608", label: "Розовая" },
  { name: "custom", accent: "#0a84ff", accentSoft: "rgba(10, 132, 255, 0.35)", accentDim: "rgba(10, 132, 255, 0.14)", bgDeep: "#060608", label: "Свой цвет" },
];

const CUSTOM_COLOR_KEY = "aurora-player-custom-color";

const THEME_KEY = "aurora-player-theme";

const STORAGE_KEY = "aurora-player-playlists";
const FAVORITES_KEY = "aurora-player-favorites";
const HISTORY_KEY = "aurora-player-history";
const MAX_HISTORY = 20;

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutTag = "timeout_client"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutTag)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </svg>
);
const IconVolume2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <path d="M16 9a3 3 0 010 6" />
  </svg>
);
const IconVolumeMute = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);
const IconVolumeLow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <path d="M15.5 9.5a2 2 0 010 5" />
  </svg>
);
const IconFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3" />
  </svg>
);
const IconPictureInPicture = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="10" y="10" width="10" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
  </svg>
);
const IconPictureInPictureExit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M10 10h10v7H10z" fill="currentColor" fillOpacity="0.2" />
    <path d="M10 10l-3-3M7 10h3V7" />
  </svg>
);
const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconPrev = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);
const IconNext = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 6h-2v12h2zm-3.5 6l-8.5 6V6z" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconStar = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7L2 9.2l7.1-.6L12 2z" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
const IconBug = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2l1.9 1.9M14.1 2L16 3.9M9 9h6M9 12h6M9 15h3" />
    <path d="M4 8h3M4 12h2M4 16h3M17 8h3M18 12h2M17 16h3" />
    <rect x="8" y="6" width="8" height="14" rx="3" />
  </svg>
);
const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);
const IconTV = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 2l-4 5-4-5" />
  </svg>
);
const IconLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" fill="#fff" stroke="none" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconSidebarToggle = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></>
    ) : (
      <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" /></>
    )}
  </svg>
);

function App() {
  const [input, setInput] = useState("");
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<Channel[]>([]);
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<{ height: number; width: number; bitrate: number; codecs: string }[]>([]);
  const [videoMeta, setVideoMeta] = useState<{ videoWidth: number; videoHeight: number; videoCodec: string } | null>(null);
  const [currentLevel, setCurrentLevel] = useState<{ height: number; bitrate: number } | null>(null);
  const [isPip, setIsPip] = useState(false);
  const [renamingPlaylist, setRenamingPlaylist] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try { return localStorage.getItem(THEME_KEY) || "default"; } catch { return "default"; }
  });
  const [customColor, setCustomColor] = useState<string>(() => {
    try { return localStorage.getItem(CUSTOM_COLOR_KEY) || "#0a84ff"; } catch { return "#0a84ff"; }
  });
  const [showGroups, setShowGroups] = useState(false);
  const [playlistAnimKey, setPlaylistAnimKey] = useState(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const debugLogRef = useRef<string[]>([]);
  const currentChannelRef = useRef<Channel | null>(null);
  const firstPlaySucceededRef = useRef(false);
  const coldStartRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playChannelRef = useRef<(ch: Channel) => void>(() => {});
  const mutedRef = useRef(false);

  const applyTheme = useCallback((themeName: string, color?: string) => {
    const theme = THEMES.find(t => t.name === themeName) || THEMES[0];
    const root = document.documentElement;
    const accent = themeName === "custom" && color ? color : theme.accent;
    const hex = accent;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.35)`);
    root.style.setProperty("--accent-dim", `rgba(${r}, ${g}, ${b}, 0.14)`);
    root.style.setProperty("--bg-deep", theme.bgDeep);
    localStorage.setItem(THEME_KEY, themeName);
    if (themeName === "custom" && color) {
      localStorage.setItem(CUSTOM_COLOR_KEY, color);
      setCustomColor(color);
    }
    setCurrentTheme(themeName);
  }, []);

  useEffect(() => {
    applyTheme(currentTheme, currentTheme === "custom" ? customColor : undefined);
  }, []);

  const addDebug = useCallback(function addDebugFn(msg: string) {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    const current = debugLogRef.current;
    const updated = current.length > 50 ? [...current.slice(1), entry] : [...current, entry];
    debugLogRef.current = updated;
    setDebugLog(updated);
    console.log(entry);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setSavedPlaylists(JSON.parse(s));
      const f = localStorage.getItem(FAVORITES_KEY);
      if (f) setFavorites(JSON.parse(f));
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => setIsPip(!!document.pictureInPictureElement);
    document.addEventListener("enterpictureinpicture", handler);
    document.addEventListener("leavepictureinpicture", handler);
    return () => {
      document.removeEventListener("enterpictureinpicture", handler);
      document.removeEventListener("leavepictureinpicture", handler);
    };
  }, []);

  useEffect(() => () => hlsRef.current?.destroy(), []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const savePlaylists = useCallback((p: Playlist[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setSavedPlaylists(p);
  }, []);

  const saveFavorites = useCallback((f: string[]) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(f));
    setFavorites(f);
  }, []);

  const saveHistory = useCallback((h: Channel[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    setHistory(h);
  }, []);

  const addToHistory = useCallback(
    (ch: Channel) => {
      const f = history.filter((h) => h.url !== ch.url);
      saveHistory([ch, ...f].slice(0, MAX_HISTORY));
    },
    [history, saveHistory]
  );

  const autoSavePlaylist = useCallback(
    (pl: Playlist) => {
      const i = savedPlaylists.findIndex((p) => p.name === pl.name);
      const u = i >= 0 ? savedPlaylists.map((p, idx) => (idx === i ? pl : p)) : [...savedPlaylists, pl];
      savePlaylists(u);
    },
    [savedPlaylists, savePlaylists]
  );

  const stopPlayback = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
    }
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffering(false);
    setError(null);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      if (val === 0) { v.muted = true; setMuted(true); }
      else { v.muted = muted; }
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    v.currentTime = frac * duration;
  }, [duration]);

  const handleFullscreen = useCallback(() => {
    const el = document.querySelector(".player-area");
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }, []);

  const handlePictureInPicture = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch (err: any) {
      addDebug(`⚠️ PiP: ${err.message}`);
    }
  }, [addDebug]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v) { setCurrentTime(v.currentTime); setDuration(v.duration || 0); }
  }, []);

  const handleLoadedMeta = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setVideoMeta({
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        videoCodec: typeof v.getVideoPlaybackQuality === "function" ? "HLS/Web" : "N/A",
      });
    }
  }, []);

  const handleVideoPlay = useCallback(() => {
    addDebug("▶ Воспроизведение");
    setPlaying(true);
    setError(null);
    const v = videoRef.current;
    if (v) v.muted = mutedRef.current;
  }, [addDebug]);
  const handleVideoPause = useCallback(() => { setPlaying(false); }, []);

  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallRecoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manifestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBufferingTimer = useCallback(() => { if (bufferingTimerRef.current) { clearTimeout(bufferingTimerRef.current); bufferingTimerRef.current = null; } }, []);
  const clearLoadingTimer = useCallback(() => { if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; } }, []);
  const clearStallRecovery = useCallback(() => { if (stallRecoveryRef.current) { clearTimeout(stallRecoveryRef.current); stallRecoveryRef.current = null; } }, []);
  const clearManifestTimeout = useCallback(() => { if (manifestTimeoutRef.current) { clearTimeout(manifestTimeoutRef.current); manifestTimeoutRef.current = null; } }, []);
  const clearColdStartRetry = useCallback(() => { if (coldStartRetryTimerRef.current) { clearTimeout(coldStartRetryTimerRef.current); coldStartRetryTimerRef.current = null; } }, []);

  const armColdStartWatchdog = useCallback(() => {
    if (firstPlaySucceededRef.current) return;
    clearColdStartRetry();
    coldStartRetryTimerRef.current = setTimeout(() => {
      if (!firstPlaySucceededRef.current) {
        firstPlaySucceededRef.current = true;
        const ch = currentChannelRef.current;
        if (ch) {
          addDebug("🧊 Холодный старт: авто-перезапуск канала");
          playChannelRef.current(ch);
        }
      }
    }, 1500);
  }, [clearColdStartRetry, addDebug]);

  const handleWaiting = useCallback(() => {
    addDebug("⏳ Буферизация");
    setBuffering(true);
    clearBufferingTimer();
    bufferingTimerRef.current = setTimeout(() => {
      addDebug("⏰ Таймаут буферизации");
      setError("Таймаут — поток не отвечает");
      setBuffering(false);
      stopPlayback();
    }, 30000);

    armColdStartWatchdog();
  }, [clearBufferingTimer, armColdStartWatchdog, stopPlayback, addDebug]);

  const handleCanPlay = useCallback(() => {
    addDebug("✅ CanPlay");
    setBuffering(false);
    firstPlaySucceededRef.current = true;
    clearBufferingTimer(); clearLoadingTimer(); clearStallRecovery(); clearColdStartRetry();
  }, [clearBufferingTimer, clearLoadingTimer, clearStallRecovery, clearColdStartRetry, addDebug]);

  const handleVideoError = useCallback(() => {
    addDebug("❌ Ошибка видео");
    setError("Ошибка воспроизведения");
    setPlaying(false); setBuffering(false);
    clearBufferingTimer(); clearLoadingTimer(); clearStallRecovery();
  }, [clearBufferingTimer, clearLoadingTimer, clearStallRecovery, addDebug]);

  const handleStalled = useCallback(() => {
    addDebug("⚠️ Stalled");
    setBuffering(true);
    clearStallRecovery();
    stallRecoveryRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && buffering) { addDebug("🔄 Восстановление"); v.play().catch(() => {}); }
    }, 5000);
  }, [buffering, clearStallRecovery, addDebug]);

  const safePlay = useCallback(
    (v: HTMLVideoElement, onFail?: (err: any) => void) => {
      armColdStartWatchdog();
      v.play().catch((err: any) => {
        if (err?.name === "AbortError") {
          addDebug("🔁 play() прерван (AbortError) — повтор");
          setTimeout(() => {
            v.play().catch((err2: any) => {
              addDebug(`❌ Play (повтор не удался): ${err2?.message || err2}`);
              onFail?.(err2);
            });
          }, 250);
          return;
        }
        addDebug(`❌ Play: ${err?.message || err}`);
        onFail?.(err);
      });
    },
    [addDebug, armColdStartWatchdog]
  );

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => { if (playing) setShowControls(false); }, 3000);
  }, [playing]);

  const playChannel = useCallback(
    async (channel: Channel) => {
      addDebug(`▶ Канал: ${channel.name}`);
      addDebug(`📎 URL: ${channel.url}`);
      stopPlayback();
      clearBufferingTimer(); clearLoadingTimer(); clearStallRecovery(); clearManifestTimeout(); clearColdStartRetry();
      currentChannelRef.current = channel;
      setCurrentChannel(channel);
      addToHistory(channel);
      setShowControls(true);
      setError(null);

      const v = videoRef.current;
      if (!v) return;

      v.muted = true;

      try {
        const result = await withTimeout(invoke<string>("check_url", { url: channel.url }), 3000);
        addDebug(`📡 ${result}`);
        const parts = result.split(":");
        if (parts[0] === "fail") {
          const status = parts[1];
          const elapsed = parts[2];
          const kind = parts[3];
          let errorMsg = "";
          if (kind === "connection_refused") errorMsg = "Сервер не отвечает";
          else if (kind === "timeout") errorMsg = "Сервер не отвечает (timeout)";
          else if (status === "404") errorMsg = "Канал не найден (404)";
          else if (status === "403") errorMsg = "Доступ запрещён (403)";
          else errorMsg = `Канал недоступен (${kind})`;
          addDebug(`❌ ${errorMsg} (${elapsed}ms)`);
          setError(errorMsg);
          setBuffering(false);
          return;
        }
        addDebug("✅ URL доступен");
      } catch (err: any) {
        if (err?.message === "timeout_client") {
          addDebug("⏱️ Проверка URL не ответила за 3с — продолжаем без неё");
        } else {
          addDebug(`⚠️ Проверка URL: ${err}`);
        }
      }

      const isHls = channel.url.includes(".m3u8") || channel.url.includes(".m3u");
      const isRtsp = channel.url.startsWith("rtsp://");
      const isUdp = channel.url.startsWith("udp://") || channel.url.startsWith("rtp://");

      if (!isHls || isRtsp || isUdp) {
        addDebug("📡 Прямой поток");
        v.src = channel.url;
        setTimeout(() => {
          safePlay(v, (err) => {
            setError(`Ошибка: ${err?.message || "неизвестная ошибка"}`);
            setBuffering(false);
          });
        }, 200);
        return;
      }

      if (!Hls.isSupported()) {
        addDebug("⚠️ hls.js не поддерживается");
        v.src = channel.url;
        setTimeout(() => {
          safePlay(v, (err) => {
            setError(`Ошибка: ${err?.message || "ошибка"}`);
            setBuffering(false);
          });
        }, 200);
        return;
      }

      addDebug("🎬 Запуск hls.js");

      manifestTimeoutRef.current = setTimeout(() => {
        addDebug("⏰ Таймаут манифеста");
        if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
        addDebug("🔄 Fallback на прямой src");
        v.src = channel.url;
        safePlay(v, (err) => {
          addDebug(`❌ Fallback: ${err?.message || err}`);
          setError("Канал недоступен");
          setBuffering(false);
        });
      }, 10000);

      const hls = new Hls({
        enableWorker: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingMaxRetryTimeout: 5000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 3,
        levelLoadingMaxRetryTimeout: 5000,
        fragLoadingTimeOut: 10000,
        fragLoadingMaxRetry: 3,
        fragLoadingMaxRetryTimeout: 5000,
        startLevel: -1,
        abrEwmaDefaultEstimate: 20000000,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.8,
        abrMaxWithRealBitrate: true,
        capLevelToPlayerSize: false,
        maxFragLookUpTolerance: 0.25,
        maxBufferSize: 0,
        maxBufferHole: 0.5,
      });

      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearManifestTimeout();
        if (hls.levels.length > 0) {
          addDebug(`📋 Манифест, уровней: ${hls.levels.length}`);
          const levels = hls.levels.map(l => ({
            height: l.height,
            width: l.width,
            bitrate: l.bitrate,
            codecs: l.audioCodec || l.videoCodec || "N/A",
          }));
          setHlsLevels(levels);
          hls.nextLevel = hls.levels.length - 1;
        } else {
          addDebug("📋 Манифест (без уровней)");
          setHlsLevels([]);
        }
        safePlay(v, () => {
          setError("Не удалось запустить воспроизведение");
          setBuffering(false);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        const level = hls.levels[data.level];
        if (level) {
          addDebug(`📊 ${level.height}p / ${(level.bitrate / 1000).toFixed(0)} kbps`);
          setCurrentLevel({ height: level.height, bitrate: level.bitrate });
        }
      });

      hls.on(Hls.Events.FRAG_LOADING, () => { clearBufferingTimer(); });
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (buffering) { addDebug("✅ Данные получены"); setBuffering(false); clearBufferingTimer(); }
      });

      hls.on(Hls.Events.ERROR, (_e, d) => {
        addDebug(`⚠️ HLS: ${d.type}/${d.details} fatal=${d.fatal}`);
        if (d.fatal) {
          switch (d.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              addDebug("🔄 startLoad()");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              addDebug("🔄 recoverMediaError()");
              hls.recoverMediaError();
              break;
            default:
              clearManifestTimeout();
              addDebug("🔄 Fallback");
              try { hls.destroy(); } catch {}
              hlsRef.current = null;
              v.src = channel.url;
              safePlay(v, (err) => {
                addDebug(`❌ Fallback: ${err?.message || err}`);
                setError("Канал недоступен");
                setBuffering(false);
              });
          }
        }
      });
    },
    [stopPlayback, addToHistory, clearBufferingTimer, clearLoadingTimer, clearStallRecovery, clearManifestTimeout, clearColdStartRetry, safePlay, buffering, addDebug]
  );

  useEffect(() => {
    playChannelRef.current = playChannel;
  }, [playChannel]);

  const sourceChannels = showFavorites
    ? playlist?.channels.filter((c) => favorites.includes(c.url)) ?? []
    : selectedGroup === "all"
    ? playlist?.channels ?? []
    : playlist?.channels.filter((c) => c.group === selectedGroup) ?? [];

  const filteredChannels = search
    ? sourceChannels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : sourceChannels;

  const goToPrevChannel = useCallback(() => {
    if (!currentChannel || !playlist) return;
    const channels = filteredChannels;
    const idx = channels.findIndex((c) => c.url === currentChannel.url);
    if (idx > 0) playChannel(channels[idx - 1]);
  }, [currentChannel, filteredChannels, playChannel]);

  const goToNextChannel = useCallback(() => {
    if (!currentChannel || !playlist) return;
    const channels = filteredChannels;
    const idx = channels.findIndex((c) => c.url === currentChannel.url);
    if (idx >= 0 && idx < channels.length - 1) playChannel(channels[idx + 1]);
  }, [currentChannel, filteredChannels, playChannel]);

  const loadPlaylist = useCallback(
    (result: Playlist) => {
      setPlaylist(result);
      const gs = ["all", ...new Set(result.channels.map((c) => c.group).filter(Boolean) as string[])];
      setGroups(gs);
      setSelectedGroup("all");
      setShowFavorites(false);
      setSearch("");
      autoSavePlaylist(result);
      setPlaylistAnimKey(k => k + 1);
    },
    [autoSavePlaylist]
  );

  const handleLoad = async () => {
    const val = input.trim();
    if (!val) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<Playlist>("detect_and_load", { input: val });
      loadPlaylist(result);
    } catch (err) {
      setError(`Ошибка: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const closePlaylist = () => {
    setPlaylist(null);
    setSearch("");
  };

  const toggleFavorite = (url: string) => {
    const exists = favorites.includes(url);
    saveFavorites(exists ? favorites.filter((f) => f !== url) : [...favorites, url]);
  };

  const isFavorite = (url: string) => favorites.includes(url);

  const deleteSavedPlaylist = (name: string) => {
    savePlaylists(savedPlaylists.filter((p) => p.name !== name));
    if (playlist?.name === name) setPlaylist(null);
  };

  const startRenaming = (name: string) => {
    setRenamingPlaylist(name);
    setRenameInput(name);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const confirmRename = () => {
    const oldName = renamingPlaylist;
    const newName = renameInput.trim();
    setRenamingPlaylist(null);
    setRenameInput("");
    if (!oldName || !newName || newName === oldName) return;
    const updated = savedPlaylists.map((p) =>
      p.name === oldName ? { ...p, name: newName } : p
    );
    savePlaylists(updated);
    if (playlist?.name === oldName) {
      setPlaylist({ ...playlist, name: newName });
    }
  };

  const cancelRename = () => {
    setRenamingPlaylist(null);
    setRenameInput("");
  };

  const VolumeIcon = muted || volume === 0 ? IconVolumeMute : volume < 0.5 ? IconVolumeLow : IconVolume2;

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => setShowSettings(!showSettings)} title="Настройки">
            <div className="logo-icon"><IconLogo /></div>
            <span className="logo-text">Aurora</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)} title="Скрыть панель">
            <IconSidebarToggle open={true} />
          </button>
        </div>

        <div className="playlist-inputs">
          <div className="input-group">
            <input
              type="text"
              placeholder="Ссылка или текст плейлиста..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
            <button onClick={handleLoad} disabled={loading}>
              {loading ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
              ) : (
                <IconArrow />
              )}
            </button>
          </div>
        </div>

        {error && !currentChannel && <div className="error">{error}</div>}

        {playlist ? (
          <>
            <div className="toolbar">
              <button className="toolbar-back" onClick={closePlaylist} title="Назад">
                <IconBack />
              </button>
              <span className="toolbar-title">{playlist.name}</span>
              <span className="toolbar-count">{filteredChannels.length}</span>
            </div>

            <div className="search-bar">
              <span className="search-bar-icon"><IconSearch /></span>
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")}>
                  <IconClose />
                </button>
              )}
              {groups.length > 1 && (
                <button
                  className={`groups-toggle ${showGroups ? "active" : ""}`}
                  onClick={() => setShowGroups(!showGroups)}
                  title="Категории"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6h10M4 12h16M6 18h12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="playlist-body">
              {showGroups && (
                <div className="group-panel">
                  <div className="group-panel-header">
                    <span>Категории</span>
                    <button className="group-panel-close" onClick={() => setShowGroups(false)}>
                      <IconClose />
                    </button>
                  </div>
                  <div className="group-list">
                    {groups.map((g) => (
                      <button
                        key={g}
                        className={`group-tab ${selectedGroup === g ? "active" : ""}`}
                        onClick={() => { setSelectedGroup(g); setShowFavorites(false); }}
                      >
                        {g === "all" ? "Все" : g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="channel-area">
                {favorites.length > 0 && (
                  <button
                    className={`favorites-toggle ${showFavorites ? "active" : ""}`}
                    onClick={() => setShowFavorites(!showFavorites)}
                  >
                    <IconStar filled={showFavorites} />
                    {showFavorites ? "Все каналы" : `Избранное · ${favorites.length}`}
                  </button>
                )}

                <div className="channel-list" key={playlistAnimKey}>
                  {filteredChannels.length === 0 && (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                      {search ? "Ничего не найдено" : "Нет каналов"}
                    </div>
                  )}
              {filteredChannels.map((ch, i) => (
                <div
                  key={i}
                  className={`channel-item ${currentChannel?.url === ch.url ? "playing" : ""}`}
                  style={{ "--index": i } as React.CSSProperties}
                  onClick={() => playChannel(ch)}
                >
                      <div className="channel-logo">
                        {ch.logo ? (
                          <img src={ch.logo} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="channel-placeholder">{ch.name.charAt(0).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="channel-info">
                        <div className="channel-name">{ch.name}</div>
                        {ch.group && <div className="channel-group">{ch.group}</div>}
                      </div>
                      <button
                        className={`channel-fav ${isFavorite(ch.url) ? "active" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(ch.url); }}
                      >
                        <IconStar filled={isFavorite(ch.url)} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {savedPlaylists.length > 0 ? (
              <div className="playlist-list">
                <div className="playlist-list-header">Мои плейлисты</div>
                {savedPlaylists.map((p, i) => (
                  <div key={i} className="playlist-list-item" onClick={() => loadPlaylist(p)}>
                    <div className="playlist-list-icon"><IconTV /></div>
                    <div className="playlist-list-body">
                      {renamingPlaylist === p.name ? (
                        <input
                          ref={renameInputRef}
                          className="rename-input"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") confirmRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          onBlur={confirmRename}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="playlist-list-name">{p.name}</div>
                      )}
                      <div className="playlist-list-count">{p.channels.length} каналов</div>
                    </div>
                    <button
                      className="playlist-list-rename"
                      onClick={(e) => { e.stopPropagation(); startRenaming(p.name); }}
                      title="Переименовать"
                    >
                      <IconEdit />
                    </button>
                    <button
                      className="playlist-list-del"
                      onClick={(e) => { e.stopPropagation(); deleteSavedPlaylist(p.name); }}
                    >
                      <IconClose />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-saved">
                <div className="empty-saved-icon"><IconFolder /></div>
                <p>Нет сохранённых плейлистов</p>
                <p className="empty-saved-hint">Вставьте ссылку выше — сохранится автоматически</p>
              </div>
            )}

            {history.length > 0 && (
              <div className="history-section">
                <div className="history-header">Недавние</div>
                {history.slice(0, 10).map((ch, i) => (
                  <div key={i} className="history-item" onClick={() => playChannel(ch)}>
                    {ch.name}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      {!sidebarOpen && (
        <button className="sidebar-reveal" onClick={() => setSidebarOpen(true)} title="Показать панель">
          <IconSidebarToggle open={false} />
        </button>
      )}

      <main
        className="player-area"
        onMouseMove={showControlsTemporarily}
        onClick={showControlsTemporarily}
      >
        {showSettings && (
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">Тема оформления</div>
            <div className="settings-themes">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  className={`theme-btn ${currentTheme === t.name ? "active" : ""}`}
                  onClick={() => applyTheme(t.name, t.name === "custom" ? customColor : undefined)}
                >
                  <span className="theme-swatch" style={{ background: t.name === "custom" ? customColor : t.accent }} />
                  <span className="theme-label">{t.label}</span>
                </button>
              ))}
              {currentTheme === "custom" && (
                <div className="custom-color-row">
                  <input
                    type="color"
                    className="color-picker"
                    value={customColor}
                    onChange={(e) => applyTheme("custom", e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="color-hex">{customColor}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {currentChannel ? (
          <>
            <div className="player-ambient" />

            <div className={`player-topbar ${showControls || !playing ? "visible" : ""}`}>
              <div className="glass-pill channel-info-bar">
                <div className="channel-logo">
                  {currentChannel.logo ? (
                    <img
                      src={currentChannel.logo}
                      alt=""
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="channel-placeholder">{currentChannel.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="channel-meta">
                  <div className="playing-label">Сейчас</div>
                  <div className="playing-name">{currentChannel.name}</div>
                </div>
              </div>

              <div className="glass-pill topbar-actions">
                <button
                  className={`ctrl-btn debug-btn ${showDebug ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setShowDebug(!showDebug); }}
                  title="Отладка"
                >
                  <IconBug />
                </button>
                <button
                  className={`player-fav ${isFavorite(currentChannel.url) ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(currentChannel.url); }}
                >
                  <IconStar filled={isFavorite(currentChannel.url)} />
                </button>
              </div>
            </div>

            <div className="video-wrapper">
              <video
                ref={videoRef}
                className="video-element"
                disablePictureInPicture={false}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onError={handleVideoError}
                onStalled={handleStalled}
                onLoadedMetadata={handleLoadedMeta}
                onDurationChange={handleTimeUpdate}
                onClick={togglePlay}
              />
              {buffering && (
                <div className="buffering-indicator">
                  <div className="buffering-spinner" />
                </div>
              )}
              {error && <div className="player-error">{error}</div>}
            </div>

            {showDebug && (
              <div className="debug-panel" onClick={(e) => e.stopPropagation()}>
                <div className="debug-header">Отладка</div>
                <div className="debug-logs">
                  {debugLog.map((entry, i) => (
                    <div key={i} className="debug-entry">{entry}</div>
                  ))}
                </div>
              </div>
            )}

            {showChannelInfo && currentChannel && (
              <div className="channel-info-panel" onClick={(e) => e.stopPropagation()}>
                <div className="channel-info-header">Информация о канале</div>
                <div className="channel-info-body">
                  <div className="channel-info-row">
                    <span className="channel-info-label">Название</span>
                    <span className="channel-info-value">{currentChannel.name}</span>
                  </div>
                  <div className="channel-info-row">
                    <span className="channel-info-label">URL</span>
                    <span className="channel-info-value channel-info-url">{currentChannel.url}</span>
                  </div>
                  {currentChannel.group && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Группа</span>
                      <span className="channel-info-value">{currentChannel.group}</span>
                    </div>
                  )}
                  {currentChannel.logo && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Логотип</span>
                      <span className="channel-info-value channel-info-url">{currentChannel.logo}</span>
                    </div>
                  )}
                  {videoMeta && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Разрешение</span>
                      <span className="channel-info-value">{videoMeta.videoWidth}×{videoMeta.videoHeight}</span>
                    </div>
                  )}
                  {currentLevel && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Текущий уровень</span>
                      <span className="channel-info-value">{currentLevel.height}p / {(currentLevel.bitrate / 1000).toFixed(0)} kbps</span>
                    </div>
                  )}
                  {hlsLevels.length > 0 && (
                    <div className="channel-info-section">
                      <div className="channel-info-label">Доступные уровни HLS</div>
                      {hlsLevels.map((l, i) => (
                        <div key={i} className="channel-info-level">
                          {l.width}×{l.height} · {(l.bitrate / 1000).toFixed(0)} kbps
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`player-controls ${showControls || !playing ? "visible" : ""}`}>
              <div className="glass-pill controls-pill">
                <div className="progress-wrap" ref={progressRef} onClick={handleProgressClick}>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                    />
                  </div>
                </div>

                <div className="controls-row">
                  <button className="ctrl-btn ctrl-skip" onClick={(e) => { e.stopPropagation(); goToPrevChannel(); }} title="Предыдущий">
                    <IconPrev />
                  </button>
                  <button className="ctrl-btn play-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                    {playing ? <IconPause /> : <IconPlay />}
                  </button>
                  <button className="ctrl-btn ctrl-skip" onClick={(e) => { e.stopPropagation(); goToNextChannel(); }} title="Следующий">
                    <IconNext />
                  </button>

                  <div className="volume-group">
                    <button className="ctrl-btn" onClick={toggleMute}><VolumeIcon /></button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                    />
                  </div>

                  <button
                    className={`ctrl-btn info-btn ${showChannelInfo ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setShowChannelInfo(!showChannelInfo); }}
                    title="Информация о канале"
                  >
                    <IconInfo />
                  </button>

                  <span className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <button
                    className="ctrl-btn"
                    onClick={(e) => { e.stopPropagation(); handlePictureInPicture(); }}
                    title={isPip ? "Выйти из PiP" : "Картинка в картинке"}
                  >
                    {isPip ? <IconPictureInPictureExit /> : <IconPictureInPicture />}
                  </button>
                  <button className="ctrl-btn" onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}>
                    <IconFullscreen />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="player-ambient" />
            <div className="empty-hero">
              <div className="hero-icon"><IconLogo /></div>
              <h1 className="hero-title">Aurora Player</h1>
              <p className="hero-desc">Вставьте ссылку на M3U плейлист или прямой поток</p>
              <div className="hero-input">
                <input
                  type="text"
                  placeholder="https://example.com/playlist.m3u8"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                />
                <button onClick={handleLoad} disabled={loading}>
                  {loading ? "Загрузка..." : "Смотреть"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;