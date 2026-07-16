import { ROOM_BOUNDS } from "./sensors.js";

export const OUTER_VIEW_DISTANCE_FT = 50;
export const OUTER_VIEW_EYE_HEIGHT_FT = 7;
export const SENSOR_VISUAL_RADIUS_FT = 50;
export const VISUAL_FLOORPLAN_SIZE_FT = 100;

export const FLOOR2_OPACITY_DEFAULT = 0.35;
export const FLOOR2_OPACITY_MIN = 0.05;
export const FLOOR2_OPACITY_MAX = 0.95;

export const Z_PLANE_DEFAULT_FT = ROOM_BOUNDS.height * 0.5;
export const Z_PLANE_MIN_FT = 0;
export const Z_PLANE_MAX_FT = ROOM_BOUNDS.height * 2;

export const TACTICAL_COLORS = {
  background: "#06140a",
  grid: "rgba(136, 168, 116, 0.26)",
  floor1Frame: "rgba(166, 202, 142, 0.78)",
  floor2Frame: "rgba(192, 214, 184, 0.56)",
  floor1Fill: "rgba(35, 67, 37, 0.36)",
  warning: "#ff695d",
  boardA: "#f3b762",
  boardB: "#7ed8b7",
  overlap: "#b8e986",
  label: "#edf6de",
};