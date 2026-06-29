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

const STORAGE_KEY = "aurora-player-playlists";
const FAVORITES_KEY = "aurora-player-favorites";
const HISTORY_KEY = "aurora-player-history";
const THEME_KEY = "aurora-player-theme";
const MAX_HISTORY = 20;

const THEME_PRESETS = {
  "Синий (по умолчанию)": { accent: "#0a84ff", bg: "#0a0a0c" },
  "Фиолетовый": { accent: "#bf5af2", bg: "#0a0a0c" },
  "Розовый": { accent: "#ff375f", bg: "#0a0a0c" },
  "Зеленый": { accent: "#30d158", bg: "#0a0a0c" },
  "Оранжевый": { accent: "#ff9f0a", bg: "#0a0a0c" },
  "Светлая": { accent: "#0a84ff", bg: "#f5f5f7" },
} as const;

type ThemeKey = keyof typeof THEME_PRESETS;

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseAccent(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.14)`;
}

function parseGlow(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.25)`;
}

function playMedia(v: HTMLVideoElement) {
  v.muted = true;
  v.load();
  v.play().catch(() => {});
  setTimeout(() => { v.muted = false; }, 200);
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [renamingPlaylist, setRenamingPlaylist] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [customAccent, setCustomAccent] = useState("");
  const [themeKey, setThemeKey] = useState<ThemeKey>("Синий (по умолчанию)");
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const debugLogRef = useRef<string[]>([]);
  const playingStartedRef = useRef(false);

  const addDebug = useCallback(function addDebugFn(msg: string) {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    const current = debugLogRef.current;
    const updated = current.length > 50 ? [...current.slice(1), entry] : [...current, entry];
    debugLogRef.current = updated;
    if (typeof setDebugLog === 'function') {
      setDebugLog(updated);
    }
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
      const t = localStorage.getItem(THEME_KEY);
      if (t) {
        const parsed = JSON.parse(t);
        if (parsed.key && parsed.key in THEME_PRESETS) {
          setThemeKey(parsed.key as ThemeKey);
        } else if (parsed.custom) {
          setThemeKey("Синий (по умолчанию)" as ThemeKey);
          setCustomAccent(parsed.custom);
        }
      }
    } catch {}
  }, []);

  useEffect(() => () => hlsRef.current?.destroy(), []);

  useEffect(() => {
    const root = document.documentElement;
    if (customAccent) {
      root.style.setProperty("--accent", customAccent);
      root.style.setProperty("--accent-hover", customAccent + "99");
      root.style.setProperty("--accent-dim", parseAccent(customAccent));
      root.style.setProperty("--accent-glow", parseGlow(customAccent));
    } else {
      const pre = THEME_PRESETS[themeKey];
      root.style.setProperty("--accent", pre.accent);
      root.style.setProperty("--accent-hover", pre.accent + "99");
      root.style.setProperty("--accent-dim", parseAccent(pre.accent));
      root.style.setProperty("--accent-glow", parseGlow(pre.accent));
    }
  }, [themeKey, customAccent]);

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

  const addToHistory = useCallback((ch: Channel) => {
    const f = history.filter((h) => h.url !== ch.url);
    saveHistory([ch, ...f].slice(0, MAX_HISTORY));
  }, [history, saveHistory]);

  const autoSavePlaylist = useCallback((pl: Playlist) => {
    const i = savedPlaylists.findIndex((p) => p.name === pl.name);
    const u = i >= 0 ? savedPlaylists.map((p, idx) => (idx === i ? pl : p)) : [...savedPlaylists, pl];
    savePlaylists(u);
  }, [savedPlaylists, savePlaylists]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      if (val === 0) {
        v.muted = true;
        setMuted(true);
      } else {
        v.muted = muted;
      }
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
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setCurrentTime(v.currentTime);
      setDuration(v.duration || 0);
    }
  }, []);

  const handleVideoPlay = useCallback(() => {
    if (!playingStartedRef.current) {
      playingStartedRef.current = true;
      addDebug("▶ Воспроизведение началось");
    }
    setPlaying(true);
    setError(null);
  }, [addDebug]);

  const handleVideoPause = useCallback(() => {
    setPlaying(false);
  }, []);

  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manifestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBufferingTimer = useCallback(() => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
  }, []);

  const clearManifestTimeout = useCallback(() => {
    if (manifestTimeoutRef.current) {
      clearTimeout(manifestTimeoutRef.current);
      manifestTimeoutRef.current = null;
    }
  }, []);

  const handleWaiting = useCallback(() => {
    addDebug("⏳ Буферизация (waiting)");
    setBuffering(true);
    clearBufferingTimer();
    bufferingTimerRef.current = setTimeout(() => {
      addDebug("⏰ Таймаут буферизации 30с");
      setError("Таймаут буферизации — поток не отвечает");
      setBuffering(false);
    }, 30000);
  }, [clearBufferingTimer, addDebug]);

  const handleCanPlay = useCallback(() => {
    addDebug("✅ CanPlay");
    setBuffering(false);
    clearBufferingTimer();
  }, [clearBufferingTimer, addDebug]);

  const handleVideoError = useCallback(() => {
    addDebug("❌ Ошибка видео");
    setError("Ошибка воспроизведения");
    setPlaying(false);
    setBuffering(false);
    clearBufferingTimer();
  }, [clearBufferingTimer, addDebug]);

  const handleStalled = useCallback(() => {
    addDebug("⚠️ Stalled (завис)");
    setBuffering(true);
  }, [addDebug]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const playChannel = useCallback((channel: Channel) => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    clearBufferingTimer();
    clearManifestTimeout();
    playingStartedRef.current = false;

    setCurrentChannel(channel);
    addToHistory(channel);
    setShowControls(true);
    setError(null);

    const v = videoRef.current;
    if (!v) return;

    const isHls = channel.url.includes(".m3u8") || channel.url.includes(".m3u");

    if (!isHls) {
      v.src = channel.url;
      playMedia(v);
      return;
    }

    if (!Hls.isSupported()) {
      v.src = channel.url;
      playMedia(v);
      return;
    }

    manifestTimeoutRef.current = setTimeout(() => {
      addDebug("⏰ timeout manifest 10s");
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
      v.src = channel.url;
      playMedia(v);
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
      fragLoadingTimeOut: 5000,
      fragLoadingMaxRetry: 2,
      fragLoadingMaxRetryTimeout: 3000,
      startLevel: -1,
      abrEwmaDefaultEstimate: 20000000,
      abrBandWidthFactor: 0.9,
      abrBandWidthUpFactor: 0.8,
      abrMaxWithRealBitrate: true,
      capLevelToPlayerSize: false,
    });

    hlsRef.current = hls;
    hls.loadSource(channel.url);
    hls.attachMedia(v);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      clearManifestTimeout();
      if (hls.levels.length > 0) {
        addDebug(`📋 Уровней: ${hls.levels.length}`);
        hls.nextLevel = hls.levels.length - 1;
      }
      v.muted = true;
      v.play().catch(() => {});
      setTimeout(() => { v.muted = false; }, 200);
    });

    hls.on(Hls.Events.FRAG_LOADING, () => {
      clearBufferingTimer();
    });

    hls.on(Hls.Events.ERROR, (_e, d) => {
      addDebug(`⚠️ ${d.type}/${d.details} fatal=${d.fatal}`);
      if (d.fatal) {
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          clearManifestTimeout();
          try { hls.destroy(); } catch {}
          hlsRef.current = null;
          v.src = channel.url;
          playMedia(v);
        }
      }
    });
  }, [addToHistory, clearBufferingTimer, clearManifestTimeout, addDebug]);

  const loadPlaylist = useCallback((result: Playlist) => {
    setPlaylist(result);
    const gs = ["all", ...new Set(result.channels.map((c) => c.group).filter(Boolean) as string[])];
    setGroups(gs);
    setSelectedGroup("all");
    setShowFavorites(false);
    setSearch("");
    autoSavePlaylist(result);
    addDebug(`📂 Плейлист: ${result.name} (${result.channels.length} каналов, ${gs.length - 1} групп)`);
  }, [autoSavePlaylist, addDebug]);

  const handleLoad = async () => {
    const val = input.trim();
    if (!val) return;
    setLoading(true);
    setError(null);
    addDebug(`📥 Загрузка: ${val.slice(0, 80)}...`);
    try {
      const result = await invoke<Playlist>("detect_and_load", { input: val });
      loadPlaylist(result);
    } catch (err) {
      addDebug(`❌ Ошибка: ${err}`);
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

  const startRename = (name: string) => {
    setRenamingPlaylist(name);
    setRenameValue(name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const confirmRename = () => {
    if (!renamingPlaylist || !renameValue.trim()) {
      setRenamingPlaylist(null);
      return;
    }
    const newName = renameValue.trim();
    const updated = savedPlaylists.map((p) => p.name === renamingPlaylist ? { ...p, name: newName } : p);
    savePlaylists(updated);
    if (playlist?.name === renamingPlaylist) {
      setPlaylist({ ...playlist, name: newName });
    }
    setRenamingPlaylist(null);
  };

  const applyTheme = (key: ThemeKey) => {
    setThemeKey(key);
    setCustomAccent("");
    localStorage.setItem(THEME_KEY, JSON.stringify({ key }));
  };

  const sourceChannels = showFavorites
    ? playlist?.channels.filter((c) => favorites.includes(c.url)) ?? []
    : selectedGroup === "all"
    ? playlist?.channels ?? []
    : playlist?.channels.filter((c) => c.group === selectedGroup) ?? [];

  const filteredChannels = search
    ? sourceChannels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : sourceChannels;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">A</span>
            <span className="logo-text">Aurora</span>
          </div>
          <button className="settings-gear" onClick={() => setShowSettings(!showSettings)} title="Настройки">⚙</button>
        </div>

        {showSettings && (
          <div className="settings-panel">
            <div className="settings-header">Тема оформления</div>
            <div className="theme-grid">
              {(Object.keys(THEME_PRESETS) as ThemeKey[]).map((key) => {
                const pre = THEME_PRESETS[key];
                return (
                  <button key={key} className={`theme-chip ${themeKey === key && !customAccent ? "active" : ""}`} onClick={() => applyTheme(key)}>
                    <span className="theme-chip-dot" style={{ background: pre.accent }} />
                    <span className="theme-chip-label">{key}</span>
                  </button>
                );
              })}
            </div>
            <div className="settings-row">
              <label className="settings-label">Свой цвет</label>
              <div className="custom-color-row">
                <input type="color" value={customAccent || THEME_PRESETS[themeKey].accent}
                  onChange={(e) => {
                    setCustomAccent(e.target.value);
                    localStorage.setItem(THEME_KEY, JSON.stringify({ custom: e.target.value }));
                  }}
                  className="color-picker"
                />
                <span className="color-hex">{customAccent || THEME_PRESETS[themeKey].accent}</span>
              </div>
            </div>
          </div>
        )}

        <div className="playlist-inputs">
          <div className="input-group">
            <input type="text" placeholder="Ссылка или текст плейлиста..." value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
            <button onClick={handleLoad} disabled={loading}>{loading ? "⏳" : "➜"}</button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {playlist ? (
          <>
            <div className="toolbar">
              <button className="toolbar-back" onClick={closePlaylist} title="Назад">←</button>
              <span className="toolbar-title">{playlist.name}</span>
              <span className="toolbar-count">{filteredChannels.length}</span>
            </div>
            <div className="search-bar">
              <input type="text" placeholder="Поиск..." value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
            </div>
            {!showFavorites && (
              <div className="group-tabs">
                {groups.map((g) => (
                  <button key={g} className={`group-tab ${selectedGroup === g ? "active" : ""}`}
                    onClick={() => setSelectedGroup(g)}
                  >{g === "all" ? "Все" : g}</button>
                ))}
              </div>
            )}
            {favorites.length > 0 && (
              <button className={`favorites-toggle ${showFavorites ? "active" : ""}`}
                onClick={() => setShowFavorites(!showFavorites)}
              >★ {showFavorites ? "Все каналы" : `Избранное (${favorites.length})`}</button>
            )}
            <div className="channel-list">
              {filteredChannels.length === 0 && (
                <div className="empty-channels" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  {search ? "Ничего не найдено" : "Нет каналов"}
                </div>
              )}
              {filteredChannels.map((ch, i) => (
                <div key={i} className={`channel-item ${currentChannel?.url === ch.url ? "playing" : ""}`}
                  onClick={() => playChannel(ch)}
                >
                  <div className="channel-logo">
                    {ch.logo ? <img src={ch.logo} alt="" /> : <div className="channel-placeholder">{ch.name.charAt(0).toUpperCase()}</div>}
                  </div>
                  <div className="channel-info">
                    <div className="channel-name">{ch.name}</div>
                    {ch.group && <div className="channel-group">{ch.group}</div>}
                  </div>
                  <button className={`channel-fav ${isFavorite(ch.url) ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(ch.url); }}
                  >{isFavorite(ch.url) ? "★" : "☆"}</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {savedPlaylists.length > 0 ? (
              <div className="playlist-list">
                <div className="playlist-list-header">Мои плейлисты</div>
                {savedPlaylists.map((p, i) => (
                  <div key={i} className="playlist-list-item" onClick={() => loadPlaylist(p)}>
                    <span className="playlist-list-icon">📺</span>
                    <div className="playlist-list-body">
                      {renamingPlaylist === p.name ? (
                        <input ref={renameInputRef} className="rename-input" value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={confirmRename}
                          onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenamingPlaylist(null); }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="playlist-list-name">{p.name}</div>
                          <div className="playlist-list-count">{p.channels.length} каналов</div>
                        </>
                      )}
                    </div>
                    <div className="playlist-list-actions">
                      <button className="playlist-list-rename"
                        onClick={(e) => { e.stopPropagation(); startRename(p.name); }} title="Переименовать">✎</button>
                      <button className="playlist-list-del"
                        onClick={(e) => { e.stopPropagation(); deleteSavedPlaylist(p.name); }} title="Удалить">×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-saved">
                <div className="empty-saved-icon">📂</div>
                <p>Нет сохранённых плейлистов</p>
                <p className="empty-saved-hint">Вставьте ссылку выше — сохранится автоматически</p>
              </div>
            )}
            {history.length > 0 && (
              <div className="history-section">
                <div className="history-header">Недавние</div>
                {history.slice(0, 10).map((ch, i) => (
                  <div key={i} className="history-item" onClick={() => playChannel(ch)}><span>{ch.name}</span></div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      <main className="player-area" onMouseMove={showControlsTemporarily} onClick={showControlsTemporarily}>
        {currentChannel ? (
          <>
            <div className="player-topbar" style={{ opacity: showControls || !playing ? 1 : 0 }}>
              <div className="channel-info-bar">
                <div className="channel-logo">
                  {currentChannel.logo ? <img src={currentChannel.logo} alt="" /> : <div className="channel-placeholder">{currentChannel.name.charAt(0).toUpperCase()}</div>}
                </div>
                <div className="channel-meta">
                  <div className="playing-label">Сейчас</div>
                  <div className="playing-name">{currentChannel.name}</div>
                </div>
              </div>
              <div className="topbar-actions">
                <button className={`ctrl-btn debug-btn ${showDebug ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setShowDebug(!showDebug); }} title="Отладка">🐛</button>
                <button className={`player-fav ${isFavorite(currentChannel.url) ? "active" : ""}`}
                  onClick={() => toggleFavorite(currentChannel.url)}
                >{isFavorite(currentChannel.url) ? "★" : "☆"}</button>
              </div>
            </div>

            <div className="video-wrapper">
              <video ref={videoRef} autoPlay className="video-element"
                onTimeUpdate={handleTimeUpdate} onPlay={handleVideoPlay} onPause={handleVideoPause}
                onWaiting={handleWaiting} onCanPlay={handleCanPlay} onError={handleVideoError}
                onStalled={handleStalled} onDurationChange={handleTimeUpdate} onClick={togglePlay}
              />
              {buffering && <div className="buffering-indicator"><div className="buffering-spinner" /></div>}
              {error && <div className="player-error">{error}</div>}
            </div>

            {showDebug && (
              <div className="debug-panel" onClick={(e) => e.stopPropagation()}>
                <div className="debug-header">Отладка</div>
                <div className="debug-logs">
                  {debugLog.map((entry, i) => <div key={i} className="debug-entry">{entry}</div>)}
                </div>
              </div>
            )}

            <div className={`player-controls ${showControls || !playing ? "visible" : ""}`}>
              <div className="progress-wrap" ref={progressRef} onClick={handleProgressClick}>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }} />
                </div>
              </div>
              <div className="controls-row">
                <button className="ctrl-btn play-btn" onClick={togglePlay}>{playing ? "⏸" : "▶"}</button>
                <div className="volume-group">
                  <button className="ctrl-btn" onClick={toggleMute}>{muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</button>
                  <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={handleVolumeChange} className="volume-slider" />
                </div>
                <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <button className="ctrl-btn fs-btn" onClick={handleFullscreen}>⛶</button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-hero">
            <div className="hero-icon">⏺</div>
            <h1 className="hero-title">Aurora Player</h1>
            <p className="hero-desc">Вставьте ссылку на M3U плейлист или прямой поток</p>
            <div className="hero-input">
              <input type="text" placeholder="https://example.com/playlist.m3u8" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              />
              <button onClick={handleLoad} disabled={loading}>{loading ? "⏳" : "Смотреть"}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;