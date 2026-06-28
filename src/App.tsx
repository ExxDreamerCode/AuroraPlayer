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
const MAX_HISTORY = 20;

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => () => hlsRef.current?.destroy(), []);

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
      v.load();
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
    setPlaying(true);
    setError(null);
  }, []);

  const handleVideoPause = useCallback(() => {
    setPlaying(false);
  }, []);

  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBufferingTimer = useCallback(() => {
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
  }, []);

  const clearLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  const handleWaiting = useCallback(() => {
    setBuffering(true);
    clearBufferingTimer();
    bufferingTimerRef.current = setTimeout(() => {
      setError("Таймаут буферизации — поток не отвечает");
      setBuffering(false);
      stopPlayback();
    }, 20000);
  }, [clearBufferingTimer, stopPlayback]);

  const handleCanPlay = useCallback(() => {
    setBuffering(false);
    clearBufferingTimer();
    clearLoadingTimer();
  }, [clearBufferingTimer, clearLoadingTimer]);

  const handleVideoError = useCallback(() => {
    setError("Ошибка воспроизведения");
    setPlaying(false);
    setBuffering(false);
    clearBufferingTimer();
    clearLoadingTimer();
  }, [clearBufferingTimer, clearLoadingTimer]);

  const handleStalled = useCallback(() => {
    setBuffering(true);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const playChannel = useCallback(
    (channel: Channel) => {
      stopPlayback();
      clearBufferingTimer();
      clearLoadingTimer();
      setCurrentChannel(channel);
      addToHistory(channel);
      setShowControls(true);

      const v = videoRef.current;
      if (!v) return;

      setError(null);

      loadingTimerRef.current = setTimeout(() => {
        setError("Таймаут загрузки — канал недоступен");
        setBuffering(false);
        stopPlayback();
      }, 30000);

      const onPlayClear = () => {
        clearLoadingTimer();
        clearBufferingTimer();
        v.removeEventListener("play", onPlayClear);
      };
      v.addEventListener("play", onPlayClear);

      const isHls = channel.url.includes(".m3u8") || channel.url.includes(".m3u");
      if (Hls.isSupported() && isHls) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          manifestLoadingTimeOut: 30000,
          manifestLoadingMaxRetry: 8,
          manifestLoadingMaxRetryTimeout: 15000,
          levelLoadingTimeOut: 30000,
          levelLoadingMaxRetry: 8,
          levelLoadingMaxRetryTimeout: 15000,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 8,
          fragLoadingMaxRetryTimeout: 15000,
          startLevel: 1,
          abrEwmaDefaultEstimate: 5000000,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.7,
          abrMaxWithRealBitrate: true,
        });

        let fallbackTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          if (hlsRef.current) {
            try { hlsRef.current.destroy(); } catch {}
            hlsRef.current = null;
          }
          v.src = channel.url;
          v.play().catch(() => {});
        }, 25000);

        hlsRef.current = hls;
        hls.loadSource(channel.url);
        hls.attachMedia(v);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          v.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            try { hls.destroy(); } catch {}
            hlsRef.current = null;
            v.src = channel.url;
            v.play().catch(() => {});
          }
        });
      } else {
        v.src = channel.url;
        setTimeout(() => {
          v.play().catch(() => {});
        }, 100);
      }
    },
    [stopPlayback, addToHistory, clearBufferingTimer, clearLoadingTimer]
  );

  const loadPlaylist = useCallback(
    (result: Playlist) => {
      setPlaylist(result);
      const gs = [
        "all",
        ...new Set(result.channels.map((c) => c.group).filter(Boolean) as string[]),
      ];
      setGroups(gs);
      setSelectedGroup("all");
      setShowFavorites(false);
      setSearch("");
      stopPlayback();
      setCurrentChannel(null);
      autoSavePlaylist(result);
    },
    [stopPlayback, autoSavePlaylist]
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
    setCurrentChannel(null);
    setSearch("");
    stopPlayback();
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
            <span className="logo-icon">◉</span>
            <span className="logo-text">Aurora</span>
          </div>
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
              {loading ? "⏳" : "➜"}
            </button>
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
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")}>×</button>
              )}
            </div>

            {!showFavorites && (
              <div className="group-tabs">
                {groups.map((g) => (
                  <button
                    key={g}
                    className={`group-tab ${selectedGroup === g ? "active" : ""}`}
                    onClick={() => setSelectedGroup(g)}
                  >
                    {g === "all" ? "Все" : g}
                  </button>
                ))}
              </div>
            )}

            {favorites.length > 0 && (
              <button
                className={`favorites-toggle ${showFavorites ? "active" : ""}`}
                onClick={() => setShowFavorites(!showFavorites)}
              >
                ★ {showFavorites ? "Все каналы" : `Избранное (${favorites.length})`}
              </button>
            )}

            <div className="channel-list">
              {filteredChannels.length === 0 && (
                <div className="empty-channels" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  {search ? "Ничего не найдено" : "Нет каналов"}
                </div>
              )}
              {filteredChannels.map((ch, i) => (
                <div
                  key={i}
                  className={`channel-item ${currentChannel?.url === ch.url ? "playing" : ""}`}
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
                    {isFavorite(ch.url) ? "★" : "☆"}
                  </button>
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
                      <div className="playlist-list-name">{p.name}</div>
                      <div className="playlist-list-count">{p.channels.length} каналов</div>
                    </div>
                    <button className="playlist-list-del" onClick={(e) => { e.stopPropagation(); deleteSavedPlaylist(p.name); }}>×</button>
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
                  <div key={i} className="history-item" onClick={() => playChannel(ch)}>
                    <span>{ch.name}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      <main
        className="player-area"
        onMouseMove={showControlsTemporarily}
        onClick={showControlsTemporarily}
      >
        {currentChannel ? (
          <>
            <div className="player-topbar" style={{ opacity: showControls || !playing ? 1 : 0 }}>
              <div className="channel-info-bar">
                <div className="channel-logo">
                  {currentChannel.logo ? (
                    <img src={currentChannel.logo} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="channel-placeholder">{currentChannel.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="channel-meta">
                  <div className="playing-label">Сейчас</div>
                  <div className="playing-name">{currentChannel.name}</div>
                </div>
              </div>
              <button
                className={`player-fav ${isFavorite(currentChannel.url) ? "active" : ""}`}
                onClick={() => toggleFavorite(currentChannel.url)}
              >
                {isFavorite(currentChannel.url) ? "★" : "☆"}
              </button>
            </div>

            <div className="video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                className="video-element"
                onTimeUpdate={handleTimeUpdate}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onError={handleVideoError}
                onStalled={handleStalled}
                onDurationChange={handleTimeUpdate}
                onClick={togglePlay}
              />

              {buffering && (
                <div className="buffering-indicator">
                  <div className="buffering-spinner" />
                </div>
              )}

              {error && (
                <div className="player-error">{error}</div>
              )}
            </div>

            <div className={`player-controls ${showControls || !playing ? "visible" : ""}`}>
              <div className="progress-wrap" ref={progressRef} onClick={handleProgressClick}>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                  />
                </div>
              </div>

              <div className="controls-row">
                <button className="ctrl-btn play-btn" onClick={togglePlay}>
                  {playing ? "⏸" : "▶"}
                </button>

                <div className="volume-group">
                  <button className="ctrl-btn" onClick={toggleMute}>
                    {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
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

                <span className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <button className="ctrl-btn fs-btn" onClick={handleFullscreen}>
                  ⛶
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-hero">
            <div className="hero-icon">◉</div>
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
                {loading ? "⏳" : "Смотреть"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;