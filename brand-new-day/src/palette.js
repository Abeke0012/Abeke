// Tier 3 for the scene: the same primitives, bound to three.js colours (sRGB hex → linear by three).
export const RAW = {
  ink950: "#150406", ink900: "#1e070a", ink800: "#2c0e13", ink700: "#431a20",
  bone50: "#f2f3f5", bone400: "#9a8a8d", bone500: "#75666a",
  scarlet500: "#e0202b", scarlet300: "#ff5d64", cobalt500: "#2b4fd0",
};
export const ROLE = {
  field: RAW.ink950,
  figure: RAW.scarlet500,
  figureHot: RAW.scarlet300,
  room: RAW.cobalt500,
  strand: RAW.bone50,
  lattice: RAW.bone400,
};
// Hue targets for the bead remap (HSL hue, 0–1).
export const HUE = { scarlet: 0.985, cobalt: 0.625 };
