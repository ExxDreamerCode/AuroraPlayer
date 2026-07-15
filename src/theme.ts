import { Theme } from "./types";
import { THEME_KEY, CUSTOM_COLOR_KEY } from "./utils";

export const THEMES: Theme[] = [
  { name: "default", accent: "#0a84ff", accentSoft: "rgba(10, 132, 255, 0.35)", accentDim: "rgba(10, 132, 255, 0.14)", bgDeep: "#060608", label: "Синяя" },
  { name: "purple", accent: "#a855f7", accentSoft: "rgba(168, 85, 247, 0.35)", accentDim: "rgba(168, 85, 247, 0.14)", bgDeep: "#0a0a12", label: "Фиолетовая" },
  { name: "green", accent: "#22c55e", accentSoft: "rgba(34, 197, 94, 0.35)", accentDim: "rgba(34, 197, 94, 0.14)", bgDeep: "#060a08", label: "Зелёная" },
  { name: "orange", accent: "#f97316", accentSoft: "rgba(249, 115, 22, 0.35)", accentDim: "rgba(249, 115, 22, 0.14)", bgDeep: "#0a0806", label: "Оранжевая" },
  { name: "pink", accent: "#ec4899", accentSoft: "rgba(236, 72, 153, 0.35)", accentDim: "rgba(236, 72, 153, 0.14)", bgDeep: "#0a0608", label: "Розовая" },
  { name: "custom", accent: "#0a84ff", accentSoft: "rgba(10, 132, 255, 0.35)", accentDim: "rgba(10, 132, 255, 0.14)", bgDeep: "#060608", label: "Свой цвет" },
];

export function applyTheme(
  themeName: string,
  color?: string,
  setCurrentTheme?: (t: string) => void,
  setCustomColor?: (c: string) => void
) {
  const theme = THEMES.find((t) => t.name === themeName) || THEMES[0];
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
    setCustomColor?.(color);
  }
  setCurrentTheme?.(themeName);
}