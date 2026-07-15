export const STORAGE_KEY = "aurora-player-playlists";
export const FAVORITES_KEY = "aurora-player-favorites";
export const HISTORY_KEY = "aurora-player-history";
export const MAX_HISTORY = 20;
export const THEME_KEY = "aurora-player-theme";
export const CUSTOM_COLOR_KEY = "aurora-player-custom-color";

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutTag = "timeout_client"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutTag)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}