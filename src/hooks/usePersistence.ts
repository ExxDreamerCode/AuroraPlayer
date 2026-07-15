import { useState, useEffect, useCallback } from "react";
import { Playlist, Channel } from "../types";
import { STORAGE_KEY, FAVORITES_KEY, HISTORY_KEY, MAX_HISTORY, THEME_KEY, CUSTOM_COLOR_KEY } from "../utils";

export function usePersistence() {
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<Channel[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try { return localStorage.getItem(THEME_KEY) || "default"; } catch { return "default"; }
  });
  const [customColor, setCustomColor] = useState<string>(() => {
    try { return localStorage.getItem(CUSTOM_COLOR_KEY) || "#0a84ff"; } catch { return "#0a84ff"; }
  });

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
      const filtered = history.filter((h) => h.url !== ch.url);
      saveHistory([ch, ...filtered].slice(0, MAX_HISTORY));
    },
    [history, saveHistory]
  );

  return {
    savedPlaylists,
    setSavedPlaylists,
    favorites,
    setFavorites,
    history,
    setHistory,
    currentTheme,
    setCurrentTheme,
    customColor,
    setCustomColor,
    savePlaylists,
    saveFavorites,
    saveHistory,
    addToHistory,
  };
}