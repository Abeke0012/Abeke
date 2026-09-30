import {
  bun as bunItem,
  patty as pattyItem,
  sauce as sauceItem,
  topping as toppingItem,
  type BunId,
  type Build,
  type PattyId,
  type SauceId,
  type ToppingId,
} from "@/lib/menu";
import { BOTTOM_BUN_H, TOP_BUN_H } from "./burgerGeometry";

/** How one layer of the burger is drawn. */
export type Look =
  | { shape: "bun"; part: "top" | "bottom"; bun: BunId }
  | { shape: "patty"; patty: PattyId }
  | { shape: "cheese" }
  | { shape: "sauce"; color: string }
  | { shape: "strands" }
  | { shape: "slices"; color: string; inner?: string; radius: number; height: number; count: number; ring: number }
  | { shape: "rings"; color: string; radius: number; tube: number; count: number; ring: number; fried?: boolean }
  | { shape: "disc"; color: string; radius: number; height: number }
  | { shape: "leaf"; color: string; ruffle: number; scallops: number; double?: boolean }
  | { shape: "strips"; color: string; count: number };

export type Layer = { key: string; label: string; look: Look };

export const thickness = (l: Look): number => {
  switch (l.shape) {
    case "bun":
      return l.part === "top" ? TOP_BUN_H : BOTTOM_BUN_H;
    case "patty":
      return 0.32;
    case "cheese":
      return 0.035;
    case "sauce":
      return 0.045;
    case "strands":
      return 0.17;
    case "slices":
      return l.height + 0.015;
    case "rings":
      return l.tube * 2 + 0.02;
    case "disc":
      return l.height;
    case "leaf":
      return l.double ? 0.12 : 0.08;
    case "strips":
      return 0.08;
  }
};

export const stackHeight = (stack: Layer[]) => stack.reduce((h, l) => h + thickness(l.look), 0);

const TOPPING_LOOK: Record<ToppingId, Look> = {
  caramelizedOnion: { shape: "strands" },
  onionRings: { shape: "rings", color: "#d4913b", radius: 0.3, tube: 0.075, count: 4, ring: 0.45, fried: true },
  potatoPatty: { shape: "disc", color: "#d49a45", radius: 0.92, height: 0.13 },
  pickles: { shape: "slices", color: "#6e7f2a", inner: "#a9b04e", radius: 0.17, height: 0.025, count: 7, ring: 0.58 },
  tomato: { shape: "slices", color: "#d3301f", inner: "#f0775a", radius: 0.4, height: 0.055, count: 4, ring: 0.44 },
  redOnion: { shape: "rings", color: "#9b3a6b", radius: 0.28, tube: 0.022, count: 5, ring: 0.5 },
  onion: { shape: "rings", color: "#efe7d4", radius: 0.28, tube: 0.022, count: 5, ring: 0.5 },
  iceberg: { shape: "leaf", color: "#c4e39a", ruffle: 0.05, scallops: 9, double: true },
  cucumber: { shape: "slices", color: "#3f7a2a", inner: "#cfe8a6", radius: 0.2, height: 0.03, count: 7, ring: 0.6 },
  cheese: { shape: "cheese" },
  mushrooms: { shape: "slices", color: "#7a5236", inner: "#c8a782", radius: 0.22, height: 0.06, count: 7, ring: 0.58 },
  arugula: { shape: "leaf", color: "#3e6d2a", ruffle: 0.07, scallops: 26 },
  lettuce: { shape: "leaf", color: "#78b243", ruffle: 0.08, scallops: 13 },
  chili: { shape: "strips", color: "#c42c1c", count: 8 },
  jalapeno: { shape: "slices", color: "#3f7d25", inner: "#c8df86", radius: 0.12, height: 0.025, count: 9, ring: 0.6 },
};

export const SAUCE_COLOR: Record<SauceId, string> = {
  piquant: "#d9542b",
  bbq: "#6e2a14",
  creamCheese: "#f1d39a",
  ranch: "#efe9da",
  cheeseSauce: "#f2b33a",
  tabasco: "#b3201a",
  teriyaki: "#4a2412",
  cherry: "#7d1426",
  thousand: "#eea77a",
};

/** Bottom-to-top order of toppings, so every build stacks the way a cook would. */
const TOPPING_ORDER: ToppingId[] = [
  "potatoPatty",
  "mushrooms",
  "caramelizedOnion",
  "onionRings",
  "pickles",
  "cucumber",
  "jalapeno",
  "chili",
  "onion",
  "redOnion",
  "tomato",
  "arugula",
  "lettuce",
  "iceberg",
];

/**
 * Turns a build into layers: bottom bun, first sauce, patties (cheese melts on
 * the first one), toppings, remaining sauces, top bun.
 */
export function stackFor(b: Build): Layer[] {
  const bunName = bunItem(b.bun).name;
  const layers: Layer[] = [{ key: `bun-bottom-${b.bun}`, label: `${bunName} · низ`, look: { shape: "bun", part: "bottom", bun: b.bun } }];
  const sauces = [...b.sauces];
  const first = sauces.shift();
  if (first) layers.push({ key: `sauce-${first}`, label: `Соус ${sauceItem(first).name}`, look: { shape: "sauce", color: SAUCE_COLOR[first] } });
  b.patties.forEach((p, i) => {
    layers.push({ key: `patty-${i}-${p}`, label: pattyItem(p).name, look: { shape: "patty", patty: p } });
    if (i === 0 && b.toppings.includes("cheese")) layers.push({ key: "cheese", label: "Сыр", look: { shape: "cheese" } });
  });
  TOPPING_ORDER.filter((t) => b.toppings.includes(t)).forEach((t) =>
    layers.push({ key: `topping-${t}`, label: toppingItem(t).name, look: TOPPING_LOOK[t] }),
  );
  sauces.forEach((s) => layers.push({ key: `sauce-${s}`, label: `Соус ${sauceItem(s).name}`, look: { shape: "sauce", color: SAUCE_COLOR[s] } }));
  layers.push({ key: `bun-top-${b.bun}`, label: `${bunName} · верх`, look: { shape: "bun", part: "top", bun: b.bun } });
  return layers;
}

/** The hero commercial's burger: brioche, beef, cheese, caramelised onion. */
export const HERO_BUILD: Build = { bun: "brioche", patties: ["beef"], toppings: ["cheese", "caramelizedOnion"], sauces: ["creamCheese"] };
