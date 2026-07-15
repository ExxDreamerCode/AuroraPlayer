export interface Channel {
  name: string;
  url: string;
  logo: string | null;
  group: string | null;
}

export interface Playlist {
  channels: Channel[];
  name: string;
}

export interface Theme {
  name: string;
  accent: string;
  accentSoft: string;
  accentDim: string;
  bgDeep: string;
  label: string;
}

export interface HlsLevelInfo {
  height: number;
  width: number;
  bitrate: number;
  codecs: string;
}

export interface CurrentLevelInfo {
  height: number;
  bitrate: number;
}

export interface VideoMeta {
  videoWidth: number;
  videoHeight: number;
  videoCodec: string;
}