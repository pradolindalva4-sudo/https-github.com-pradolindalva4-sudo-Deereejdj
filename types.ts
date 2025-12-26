export interface Track {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  url: string;
  duration: number;
  file?: File; // Added to store the actual file object
}

export interface DeckState {
  playing: boolean;
  tempo: number; // Percentage -8 to +8 typically, here 0.92 to 1.08
  currentTime: number;
  duration: number;
  track: Track | null;
}

export interface EQState {
  high: number;
  mid: number;
  low: number;
  gain: number;
}

export enum Channel {
  A = 'A',
  B = 'B'
}