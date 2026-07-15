export const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

export const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </svg>
);

export const IconVolume2 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <path d="M16 9a3 3 0 010 6" />
  </svg>
);

export const IconVolumeMute = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

export const IconVolumeLow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 5L6 9H3v6h3l5 4V5z" />
    <path d="M15.5 9.5a2 2 0 010 5" />
  </svg>
);

export const IconFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M3 16v3a2 2 0 002 2h3" />
  </svg>
);

export const IconPictureInPicture = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <rect x="10" y="10" width="10" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

export const IconPictureInPictureExit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M10 10h10v7H10z" fill="currentColor" fillOpacity="0.2" />
    <path d="M10 10l-3-3M7 10h3V7" />
  </svg>
);

export const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const IconPrev = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

export const IconNext = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 6h-2v12h2zm-3.5 6l-8.5 6V6z" />
  </svg>
);

export const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const IconStar = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7L2 9.2l7.1-.6L12 2z" />
  </svg>
);

export const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export const IconBug = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2l1.9 1.9M14.1 2L16 3.9M9 9h6M9 12h6M9 15h3" />
    <path d="M4 8h3M4 12h2M4 16h3M17 8h3M18 12h2M17 16h3" />
    <rect x="8" y="6" width="8" height="14" rx="3" />
  </svg>
);

export const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);

export const IconTV = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 2l-4 5-4-5" />
  </svg>
);

export const IconLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" fill="#fff" stroke="none" />
  </svg>
);

export const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconSidebarToggle = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></>
    ) : (
      <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" /></>
    )}
  </svg>
);

export const IconSpinner = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
  </svg>
);

export const IconFilter = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 6h10M4 12h16M6 18h12" />
  </svg>
);