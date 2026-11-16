export type Point = { x: number; z: number };
export type Artwork = {
  id: string;
  title: string;
  en: string;
  artist: string;
  year: string;
  medium: string;
  color: string;
  /** Original physical size in centimetres. The study space keeps this ratio at 1:1. */
  size: { width: number; height: number };
  position: Point;
  facing: number;
  description: string;
  /** Spatial organisation, used by the study room's comparison matrix. */
  composition: string;
  /** Recurring concerns, used to surface shared themes between works. */
  themes: string[];
  transcript: string[];
  duration: number;
};
export type Route = {
  id: string;
  name: string;
  subtitle: string;
  stops: string[];
};
export type Visit = { id: string; seconds: number; at: number };
export type Comparison = {
  /** Artwork ids, kept in the order the visitor arranged them. */
  ids: string[];
  note: string;
  segment: number;
  at: number;
};
export type GalleryDocument = {
  favorites: string[];
  visits: Visit[];
  notes: Record<string, string>;
  comparisons: Comparison[];
  /** Last composition carried into the study room. */
  studyIds: string[];
};
export type TourState = {
  routeId: string | null;
  step: number;
  phase: "idle" | "walking" | "listening" | "paused" | "done";
  /** Remembers what to resume to after a pause, so a listening stop resumes listening. */
  pausedFrom?: "walking" | "listening";
};
export type AudioState = {
  artworkId: string | null;
  elapsed: number;
  playing: boolean;
  rate: number;
};
export type Command =
  { type: "focus"; id: string } | { type: "favorite"; id: string };
