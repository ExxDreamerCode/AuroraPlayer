import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Playlist } from "../types";

export function usePlaylist(
  savedPlaylists: Playlist[],
  savePlaylists: (p: Playlist[]) => void,
  favorites: string[],
  saveFavorites: (f: string[]) => void
) {
  const [input, setInput] = useState("");
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [playlistAnimKey, setPlaylistAnimKey] = useState(0);
  const [renamingPlaylist, setRenamingPlaylist] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const renameInputRef = useCallback((el: HTMLInputElement | null) => {
    if (el) setTimeout(() => el.select(), 50);
  }, []);

  const autoSavePlaylist = useCallback(
    (pl: Playlist) => {
      const i = savedPlaylists.findIndex((p) => p.name === pl.name);
      const u =
        i >= 0
          ? savedPlaylists.map((p, idx) => (idx === i ? pl : p))
          : [...savedPlaylists, pl];
      savePlaylists(u);
    },
    [savedPlaylists, savePlaylists]
  );

  const loadPlaylist = useCallback(
    (result: Playlist) => {
      setPlaylist((prev) => {
        const isSamePlaylist =
          prev?.name === result.name &&
          prev.channels.length === result.channels.length;
        if (!isSamePlaylist) setPlaylistAnimKey((k) => k + 1);
        return result;
      });
      const gs = [
        "all",
        ...new Set(
          result.channels.map((c) => c.group).filter(Boolean) as string[]
        ),
      ];
      setGroups(gs);
      setSelectedGroup("all");
      setShowFavorites(false);
      setSearch("");
      autoSavePlaylist(result);
    },
    [autoSavePlaylist]
  );

  const handleLoad = useCallback(async () => {
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
  }, [input, loadPlaylist]);

  const closePlaylist = useCallback(() => {
    setPlaylist(null);
    setSearch("");
  }, []);

  const toggleFavorite = useCallback(
    (url: string) => {
      const exists = favorites.includes(url);
      saveFavorites(
        exists ? favorites.filter((f) => f !== url) : [...favorites, url]
      );
    },
    [favorites, saveFavorites]
  );

  const isFavorite = useCallback(
    (url: string) => favorites.includes(url),
    [favorites]
  );

  const deleteSavedPlaylist = useCallback(
    (name: string) => {
      savePlaylists(savedPlaylists.filter((p) => p.name !== name));
      if (playlist?.name === name) setPlaylist(null);
    },
    [savedPlaylists, savePlaylists, playlist]
  );

  const startRenaming = useCallback((name: string) => {
    setRenamingPlaylist(name);
    setRenameInput(name);
  }, []);

  const confirmRename = useCallback(() => {
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
  }, [renamingPlaylist, renameInput, savedPlaylists, savePlaylists, playlist]);

  const cancelRename = useCallback(() => {
    setRenamingPlaylist(null);
    setRenameInput("");
  }, []);

  // Derived data
  const sourceChannels = showFavorites
    ? playlist?.channels.filter((c) => favorites.includes(c.url)) ?? []
    : selectedGroup === "all"
    ? playlist?.channels ?? []
    : playlist?.channels.filter((c) => c.group === selectedGroup) ?? [];

  const filteredChannels = search
    ? sourceChannels.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : sourceChannels;

  return {
    input,
    setInput,
    playlist,
    loading,
    error,
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
    sourceChannels,
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
  };
}