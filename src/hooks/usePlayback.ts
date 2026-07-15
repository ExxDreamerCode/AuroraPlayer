import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Hls from "hls.js";
import { Channel, HlsLevelInfo, CurrentLevelInfo, VideoMeta } from "../types";
import { withTimeout } from "../utils";

export function usePlayback(addDebug: (msg: string) => void) {
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hlsLevels, setHlsLevels] = useState<HlsLevelInfo[]>([]);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [currentLevel, setCurrentLevel] = useState<CurrentLevelInfo | null>(null);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const currentChannelRef = useRef<Channel | null>(null);
  const firstPlaySucceededRef = useRef(false);
  const mutedRef = useRef(false);
  const playChannelRef = useRef<(ch: Channel) => void>(() => {});
  const uiHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallRecoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manifestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coldStartRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const clearStallRecovery = useCallback(() => {
    if (stallRecoveryRef.current) {
      clearTimeout(stallRecoveryRef.current);
      stallRecoveryRef.current = null;
    }
  }, []);

  const clearManifestTimeout = useCallback(() => {
    if (manifestTimeoutRef.current) {
      clearTimeout(manifestTimeoutRef.current);
      manifestTimeoutRef.current = null;
    }
  }, []);

  const clearColdStartRetry = useCallback(() => {
    if (coldStartRetryTimerRef.current) {
      clearTimeout(coldStartRetryTimerRef.current);
      coldStartRetryTimerRef.current = null;
    }
  }, []);

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

  const playChannel = useCallback(
    async (channel: Channel, addToHistory?: (ch: Channel) => void) => {
      addDebug(`▶ Канал: ${channel.name}`);
      addDebug(`📎 URL: ${channel.url}`);
      stopPlayback();
      clearBufferingTimer();
      clearLoadingTimer();
      clearStallRecovery();
      clearManifestTimeout();
      clearColdStartRetry();
      currentChannelRef.current = channel;
      setCurrentChannel(channel);
      addToHistory?.(channel);
      setShowControls(true);
      setError(null);

      const v = videoRef.current;
      if (!v) return;

      v.muted = true;

      try {
        const result = await withTimeout(
          invoke<string>("check_url", { url: channel.url }),
          3000
        );
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

      const isHls =
        channel.url.includes(".m3u8") || channel.url.includes(".m3u");
      const isRtsp = channel.url.startsWith("rtsp://");
      const isUdp =
        channel.url.startsWith("udp://") || channel.url.startsWith("rtp://");

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
        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch {}
          hlsRef.current = null;
        }
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
          const levels = hls.levels.map((l) => ({
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
          addDebug(
            `📊 ${level.height}p / ${(level.bitrate / 1000).toFixed(0)} kbps`
          );
          setCurrentLevel({ height: level.height, bitrate: level.bitrate });
        }
      });

      hls.on(Hls.Events.FRAG_LOADING, () => {
        clearBufferingTimer();
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (buffering) {
          addDebug("✅ Данные получены");
          setBuffering(false);
          clearBufferingTimer();
        }
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
              try {
                hls.destroy();
              } catch {}
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
    [
      stopPlayback,
      clearBufferingTimer,
      clearLoadingTimer,
      clearStallRecovery,
      clearManifestTimeout,
      clearColdStartRetry,
      safePlay,
      buffering,
      addDebug,
    ]
  );

  useEffect(() => {
    playChannelRef.current = playChannel;
  }, [playChannel]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [muted]
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = (e.clientX - rect.left) / rect.width;
      v.currentTime = frac * duration;
    },
    [duration]
  );

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
    if (v) {
      setCurrentTime(v.currentTime);
      setDuration(v.duration || 0);
    }
  }, []);

  const handleLoadedMeta = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setVideoMeta({
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        videoCodec:
          typeof v.getVideoPlaybackQuality === "function" ? "HLS/Web" : "N/A",
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

  const handleVideoPause = useCallback(() => {
    setPlaying(false);
  }, []);

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
    clearBufferingTimer();
    clearLoadingTimer();
    clearStallRecovery();
    clearColdStartRetry();
  }, [
    clearBufferingTimer,
    clearLoadingTimer,
    clearStallRecovery,
    clearColdStartRetry,
    addDebug,
  ]);

  const handleVideoError = useCallback(() => {
    addDebug("❌ Ошибка видео");
    setError("Ошибка воспроизведения");
    setPlaying(false);
    setBuffering(false);
    clearBufferingTimer();
    clearLoadingTimer();
    clearStallRecovery();
  }, [clearBufferingTimer, clearLoadingTimer, clearStallRecovery, addDebug]);

  const handleStalled = useCallback(() => {
    addDebug("⚠️ Stalled");
    setBuffering(true);
    clearStallRecovery();
    stallRecoveryRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && buffering) {
        addDebug("🔄 Восстановление");
        v.play().catch(() => {});
      }
    }, 5000);
  }, [buffering, clearStallRecovery, addDebug]);

  const handleMouseActivity = useCallback(() => {
    setShowControls(true);
    setCursorVisible(true);
    if (uiHideTimerRef.current) clearTimeout(uiHideTimerRef.current);
    if (cursorHideTimerRef.current) clearTimeout(cursorHideTimerRef.current);
    uiHideTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
    cursorHideTimerRef.current = setTimeout(() => {
      if (playing) setCursorVisible(false);
    }, 4000);
  }, [playing]);

  return {
    // state
    currentChannel,
    setCurrentChannel,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    buffering,
    error,
    hlsLevels,
    videoMeta,
    currentLevel,
    isPip,
    showControls,
    showChannelInfo,
    showDebug,
    cursorVisible,
    // refs
    videoRef,
    hlsRef,
    progressRef,
    currentChannelRef,
    // setters
    setShowControls,
    setShowChannelInfo,
    setShowDebug,
    setError,
    setBuffering,
    setMuted,
    setVolume,
    setPlaying,
    setCurrentTime,
    setDuration,
    setHlsLevels,
    setVideoMeta,
    setCurrentLevel,
    // actions
    playChannel,
    togglePlay,
    handleVolumeChange,
    toggleMute,
    handleProgressClick,
    handleFullscreen,
    handlePictureInPicture,
    handleTimeUpdate,
    handleLoadedMeta,
    handleVideoPlay,
    handleVideoPause,
    handleWaiting,
    handleCanPlay,
    handleVideoError,
    handleStalled,
    handleMouseActivity,
    stopPlayback,
  };
}