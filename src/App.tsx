import { useCallback, useEffect } from "react";
import "./App.css";

import { Channel } from "./types";
import { formatTime } from "./utils";
import { THEMES, applyTheme } from "./theme";
import {
  IconPlay,
  IconPause,
  IconVolume2,
  IconVolumeMute,
  IconVolumeLow,
  IconFullscreen,
  IconPictureInPicture,
  IconPictureInPictureExit,
  IconBack,
  IconPrev,
  IconNext,
  IconSearch,
  IconClose,
  IconEdit,
  IconStar,
  IconInfo,
  IconBug,
  IconFolder,
  IconTV,
  IconLogo,
  IconArrow,
  IconSidebarToggle,
  IconSpinner,
  IconFilter,
} from "./icons";

import { useDebug } from "./hooks/useDebug";
import { usePersistence } from "./hooks/usePersistence";
import { usePlayback } from "./hooks/usePlayback";
import { usePlaylist } from "./hooks/usePlaylist";

function App() {
  const { debugLog, addDebug } = useDebug();
  const {
    savedPlaylists,
    favorites,
    history,
    currentTheme,
    customColor,
    savePlaylists,
    saveFavorites,
    addToHistory,
    setCurrentTheme,
    setCustomColor,
  } = usePersistence();

  const {
    currentChannel,
    playing,
    currentTime,
    duration,
    volume,
    muted,
    buffering,
    error: playbackError,
    hlsLevels,
    videoMeta,
    currentLevel,
    isPip,
    showControls,
    showChannelInfo,
    showDebug,
    cursorVisible,
    videoRef,
    progressRef,
    setShowChannelInfo,
    setShowDebug,
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
  } = usePlayback(addDebug);

  const {
    input,
    setInput,
    playlist,
    loading,
    error: playlistError,
    groups,
    selectedGroup,
    setSelectedGroup,
    search,
    setSearch,
    showFavorites,
    setShowFavorites,
    showGroups,
    setShowGroups,
    playlistAnimKey,
    renamingPlaylist,
    renameInput,
    setRenameInput,
    showSettings,
    setShowSettings,
    sidebarOpen,
    setSidebarOpen,
    renameInputRef,
    filteredChannels,
    loadPlaylist,
    handleLoad,
    closePlaylist,
    toggleFavorite,
    isFavorite,
    deleteSavedPlaylist,
    startRenaming,
    confirmRename,
    cancelRename,
  } = usePlaylist(savedPlaylists, savePlaylists, favorites, saveFavorites);

  const handlePlayChannel = useCallback(
    (ch: Channel) => {
      playChannel(ch, addToHistory);
    },
    [playChannel, addToHistory]
  );

  const goToPrevChannel = useCallback(() => {
    if (!currentChannel || !playlist) return;
    const channels = filteredChannels;
    const idx = channels.findIndex((c) => c.url === currentChannel.url);
    if (idx > 0) handlePlayChannel(channels[idx - 1]);
  }, [currentChannel, filteredChannels, handlePlayChannel, playlist]);

  const goToNextChannel = useCallback(() => {
    if (!currentChannel || !playlist) return;
    const channels = filteredChannels;
    const idx = channels.findIndex((c) => c.url === currentChannel.url);
    if (idx >= 0 && idx < channels.length - 1)
      handlePlayChannel(channels[idx + 1]);
  }, [currentChannel, filteredChannels, handlePlayChannel, playlist]);

  useEffect(() => {
    applyTheme(
      currentTheme,
      currentTheme === "custom" ? customColor : undefined,
      setCurrentTheme,
      setCustomColor
    );
  }, []);

  const error = playlistError || playbackError;
  const VolumeIcon =
    muted || volume === 0 ? IconVolumeMute : volume < 0.5 ? IconVolumeLow : IconVolume2;

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <div className="sidebar-header">
          <div
            className="logo"
            onClick={() => setShowSettings(!showSettings)}
            title="Настройки"
          >
            <div className="logo-icon">
              <IconLogo />
            </div>
            <span className="logo-text">Aurora</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(false)}
            title="Скрыть панель"
          >
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
              {loading ? <IconSpinner /> : <IconArrow />}
            </button>
          </div>
        </div>

        {error && !currentChannel && <div className="error">{error}</div>}

        {playlist ? (
          <>
            <div className="toolbar">
              <button
                className="toolbar-back"
                onClick={closePlaylist}
                title="Назад"
              >
                <IconBack />
              </button>
              <span className="toolbar-title">{playlist.name}</span>
              <span className="toolbar-count">{filteredChannels.length}</span>
            </div>

            <div className="search-bar">
              <span className="search-bar-icon">
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="search-clear"
                  onClick={() => setSearch("")}
                >
                  <IconClose />
                </button>
              )}
              {groups.length > 1 && (
                <button
                  className={`groups-toggle ${showGroups ? "active" : ""}`}
                  onClick={() => setShowGroups(!showGroups)}
                  title="Категории"
                >
                  <IconFilter />
                </button>
              )}
            </div>

            <div className="playlist-body">
              {showGroups && (
                <div className="group-panel">
                  <div className="group-panel-header">
                    <span>Категории</span>
                    <button
                      className="group-panel-close"
                      onClick={() => setShowGroups(false)}
                    >
                      <IconClose />
                    </button>
                  </div>
                  <div className="group-list">
                    {groups.map((g) => (
                      <button
                        key={g}
                        className={`group-tab ${selectedGroup === g ? "active" : ""}`}
                        onClick={() => {
                          setSelectedGroup(g);
                          setShowFavorites(false);
                        }}
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
                    {showFavorites
                      ? "Все каналы"
                      : `Избранное · ${favorites.length}`}
                  </button>
                )}

                <div className="channel-list" key={playlistAnimKey}>
                  {filteredChannels.length === 0 && (
                    <div
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: "var(--text-tertiary)",
                        fontSize: 13,
                      }}
                    >
                      {search ? "Ничего не найдено" : "Нет каналов"}
                    </div>
                  )}
                  {filteredChannels.map((ch, i) => (
                    <div
                      key={i}
                      className={`channel-item ${currentChannel?.url === ch.url ? "playing" : ""}`}
                      style={{ "--index": i } as React.CSSProperties}
                      onClick={() => handlePlayChannel(ch)}
                    >
                      <div className="channel-logo">
                        {ch.logo ? (
                          <img
                            src={ch.logo}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="channel-placeholder">
                            {ch.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="channel-info">
                        <div className="channel-name">{ch.name}</div>
                        {ch.group && (
                          <div className="channel-group">{ch.group}</div>
                        )}
                      </div>
                      <button
                        className={`channel-fav ${isFavorite(ch.url) ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(ch.url);
                        }}
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
                  <div
                    key={i}
                    className="playlist-list-item"
                    onClick={() => loadPlaylist(p)}
                  >
                    <div className="playlist-list-icon">
                      <IconTV />
                    </div>
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
                      <div className="playlist-list-count">
                        {p.channels.length} каналов
                      </div>
                    </div>
                    <button
                      className="playlist-list-rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenaming(p.name);
                      }}
                      title="Переименовать"
                    >
                      <IconEdit />
                    </button>
                    <button
                      className="playlist-list-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedPlaylist(p.name);
                      }}
                    >
                      <IconClose />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-saved">
                <div className="empty-saved-icon">
                  <IconFolder />
                </div>
                <p>Нет сохранённых плейлистов</p>
                <p className="empty-saved-hint">
                  Вставьте ссылку выше — сохранится автоматически
                </p>
              </div>
            )}

            {history.length > 0 && (
              <div className="history-section">
                <div className="history-header">Недавние</div>
                {history.slice(0, 10).map((ch, i) => (
                  <div
                    key={i}
                    className="history-item"
                    onClick={() => handlePlayChannel(ch)}
                  >
                    {ch.name}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      {!sidebarOpen && (
        <button
          className="sidebar-reveal"
          onClick={() => setSidebarOpen(true)}
          title="Показать панель"
        >
          <IconSidebarToggle open={false} />
        </button>
      )}

      <main
        className={`player-area ${!cursorVisible && currentChannel && playing ? "cursor-hidden" : ""}`}
        onMouseMove={handleMouseActivity}
        onClick={handleMouseActivity}
      >
        {showSettings && (
          <div
            className="settings-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-header">Тема оформления</div>
            <div className="settings-themes">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  className={`theme-btn ${currentTheme === t.name ? "active" : ""}`}
                  onClick={() =>
                    applyTheme(
                      t.name,
                      t.name === "custom" ? customColor : undefined,
                      setCurrentTheme,
                      setCustomColor
                    )
                  }
                >
                  <span
                    className="theme-swatch"
                    style={{
                      background:
                        t.name === "custom" ? customColor : t.accent,
                    }}
                  />
                  <span className="theme-label">{t.label}</span>
                </button>
              ))}
              {currentTheme === "custom" && (
                <div className="custom-color-row">
                  <input
                    type="color"
                    className="color-picker"
                    value={customColor}
                    onChange={(e) =>
                      applyTheme(
                        "custom",
                        e.target.value,
                        setCurrentTheme,
                        setCustomColor
                      )
                    }
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

            <div
              className={`player-topbar ${showControls || !playing ? "visible" : ""}`}
            >
              <div className="glass-pill channel-info-bar">
                <div className="channel-logo">
                  {currentChannel.logo ? (
                    <img
                      src={currentChannel.logo}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="channel-placeholder">
                      {currentChannel.name.charAt(0).toUpperCase()}
                    </div>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDebug(!showDebug);
                  }}
                  title="Отладка"
                >
                  <IconBug />
                </button>
                <button
                  className={`player-fav ${isFavorite(currentChannel.url) ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(currentChannel.url);
                  }}
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
              <div
                className="debug-panel"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="debug-header">Отладка</div>
                <div className="debug-logs">
                  {debugLog.map((entry, i) => (
                    <div key={i} className="debug-entry">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showChannelInfo && currentChannel && (
              <div
                className="channel-info-panel"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="channel-info-header">
                  Информация о канале
                </div>
                <div className="channel-info-body">
                  <div className="channel-info-row">
                    <span className="channel-info-label">Название</span>
                    <span className="channel-info-value">
                      {currentChannel.name}
                    </span>
                  </div>
                  <div className="channel-info-row">
                    <span className="channel-info-label">URL</span>
                    <span className="channel-info-value channel-info-url">
                      {currentChannel.url}
                    </span>
                  </div>
                  {currentChannel.group && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Группа</span>
                      <span className="channel-info-value">
                        {currentChannel.group}
                      </span>
                    </div>
                  )}
                  {currentChannel.logo && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Логотип</span>
                      <span className="channel-info-value channel-info-url">
                        {currentChannel.logo}
                      </span>
                    </div>
                  )}
                  {videoMeta && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">Разрешение</span>
                      <span className="channel-info-value">
                        {videoMeta.videoWidth}×{videoMeta.videoHeight}
                      </span>
                    </div>
                  )}
                  {currentLevel && (
                    <div className="channel-info-row">
                      <span className="channel-info-label">
                        Текущий уровень
                      </span>
                      <span className="channel-info-value">
                        {currentLevel.height}p /{" "}
                        {(currentLevel.bitrate / 1000).toFixed(0)} kbps
                      </span>
                    </div>
                  )}
                  {hlsLevels.length > 0 && (
                    <div className="channel-info-section">
                      <div className="channel-info-label">
                        Доступные уровни HLS
                      </div>
                      {hlsLevels.map((l, i) => (
                        <div key={i} className="channel-info-level">
                          {l.width}×{l.height} ·{" "}
                          {(l.bitrate / 1000).toFixed(0)} kbps
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              className={`player-controls ${showControls || !playing ? "visible" : ""}`}
            >
              <div className="glass-pill controls-pill">
                <div
                  className="progress-wrap"
                  ref={progressRef}
                  onClick={handleProgressClick}
                >
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: duration
                          ? `${(currentTime / duration) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>

                <div className="controls-row">
                  <button
                    className="ctrl-btn ctrl-skip"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevChannel();
                    }}
                    title="Предыдущий"
                  >
                    <IconPrev />
                  </button>
                  <button
                    className="ctrl-btn play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                  >
                    {playing ? <IconPause /> : <IconPlay />}
                  </button>
                  <button
                    className="ctrl-btn ctrl-skip"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextChannel();
                    }}
                    title="Следующий"
                  >
                    <IconNext />
                  </button>

                  <div className="volume-group">
                    <button className="ctrl-btn" onClick={toggleMute}>
                      <VolumeIcon />
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

                  <button
                    className={`ctrl-btn info-btn ${showChannelInfo ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChannelInfo(!showChannelInfo);
                    }}
                    title="Информация о канале"
                  >
                    <IconInfo />
                  </button>

                  <span className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <button
                    className="ctrl-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePictureInPicture();
                    }}
                    title={isPip ? "Выйти из PiP" : "Картинка в картинке"}
                  >
                    {isPip ? (
                      <IconPictureInPictureExit />
                    ) : (
                      <IconPictureInPicture />
                    )}
                  </button>
                  <button
                    className="ctrl-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFullscreen();
                    }}
                  >
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
              <div className="hero-icon">
                <IconLogo />
              </div>
              <h1 className="hero-title">Aurora Player</h1>
              <p className="hero-desc">
                Вставьте ссылку на M3U плейлист или прямой поток
              </p>
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