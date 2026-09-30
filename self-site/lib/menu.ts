/** SELF menu, Astana. Source: "Self-menu" PDF. Prices in tenge. */

export type Option = { portion: string; price: number };
export type Item<Id extends string = string> = { id: Id; name: string; options: Option[] };

const one = <Id extends string>(id: Id, name: string, portion: string, price: number): Item<Id> => ({ id, name, options: [{ portion, price }] });

export const BUNS = [
  one("sesame", "Классическая с кунжутом", "80 г", 450),
  one("brioche", "Бриошь", "80 г", 500),
  one("black", "Чёрная", "80 г", 500),
] as const;

export const PATTIES = [
  one("beef", "Говяжья котлета", "120 г", 1790),
  one("chicken", "Куриная котлета", "120 г", 890),
  one("chickenFillet", "Куриное филе", "120 г", 1090),
  one("pulled", "Томлёное мясо", "120 г", 1590),
  one("salmon", "Сёмга", "120 г", 2790),
] as const;

export const TOPPINGS = [
  one("caramelizedOnion", "Карамелизированный лук", "20 г", 180),
  one("onionRings", "Луковые кольца", "30 г", 250),
  one("potatoPatty", "Картофельная котлета", "50 г", 300),
  one("pickles", "Солёные огурцы", "20 г", 150),
  one("tomato", "Помидор", "25 г", 150),
  one("redOnion", "Красный лук", "15 г", 120),
  one("onion", "Лук", "15 г", 100),
  one("iceberg", "Айсберг", "20 г", 120),
  one("cucumber", "Свежие огурцы", "20 г", 150),
  one("cheese", "Сыр", "20 г", 250),
  one("mushrooms", "Обжаренные шампиньоны", "30 г", 300),
  one("arugula", "Руккола", "10 г", 200),
  one("lettuce", "Лист салата", "15 г", 100),
  one("chili", "Стручковый перец", "20 г", 180),
  one("jalapeno", "Халапеньо", "15 г", 180),
] as const;

export const SAUCES = [
  one("piquant", "Пикант", "30 г", 250),
  one("bbq", "BBQ", "30 г", 250),
  one("creamCheese", "Сливочно-сырный", "30 г", 300),
  one("ranch", "Ранч", "30 г", 250),
  one("cheeseSauce", "Сырный", "30 г", 300),
  one("tabasco", "Табаско", "20 г", 300),
  one("teriyaki", "Терияки", "30 г", 250),
  one("cherry", "Вишнёвый", "30 г", 300),
  one("thousand", "1000 островов", "30 г", 250),
] as const;

export const SIDES = [
  one("fries", "Картофель фри", "120 г", 950),
  one("wedges", "Картофель по-деревенски", "150 г", 1100),
  one("nuggets", "Наггетсы", "150 г", 1500),
  one("rings", "Луковые кольца", "120 г", 1350),
  one("sweetPotato", "Батат", "120 г", 1500),
  one("cheeseBalls", "Сырные шарики", "120 г", 1500),
] as const;

const sizes = (small: string, sp: number, big: string, bp: number) => [
  { portion: small, price: sp },
  { portion: big, price: bp },
];

export const DRINKS: Item[] = [
  { id: "mojito", name: "Лимонад Мохито", options: sizes("500 мл", 980, "1 л", 1880) },
  { id: "watermelon", name: "Лимонад Арбуз-клубника", options: sizes("500 мл", 980, "1 л", 1880) },
  { id: "cranberry", name: "Лимонад клюквенный", options: sizes("500 мл", 980, "1 л", 1880) },
  { id: "cola", name: "Coca-Cola", options: sizes("500 мл", 880, "1 л", 1580) },
  { id: "colaZero", name: "Coca-Cola Zero", options: sizes("500 мл", 880, "1 л", 1580) },
  { id: "fanta", name: "Fanta", options: sizes("500 мл", 880, "1 л", 1580) },
  { id: "sprite", name: "Sprite", options: sizes("500 мл", 880, "1 л", 1580) },
  { id: "borjomi", name: "Borjomi", options: sizes("500 мл", 1080, "750 мл", 1780) },
  { id: "tassay", name: "Tassay", options: sizes("500 мл", 680, "1 л", 1080) },
];

export type BunId = (typeof BUNS)[number]["id"];
export type PattyId = (typeof PATTIES)[number]["id"];
export type ToppingId = (typeof TOPPINGS)[number]["id"];
export type SauceId = (typeof SAUCES)[number]["id"];
export type SideId = (typeof SIDES)[number]["id"];

export const MAX_PATTIES = 4;
export const MAX_SAUCES = 3;

export const MENU_TABS: { id: string; label: string; note?: string; items: readonly Item[] }[] = [
  { id: "buns", label: "Булочки", items: BUNS },
  { id: "patties", label: "Котлеты", note: `Можно выбрать сразу несколько видов — до ${MAX_PATTIES} котлет в одном бургере.`, items: PATTIES },
  { id: "toppings", label: "Ингредиенты", items: TOPPINGS },
  { id: "sauces", label: "Соусы", note: `До ${MAX_SAUCES} соусов на один бургер.`, items: SAUCES },
  { id: "sides", label: "Гарниры", items: SIDES },
  { id: "drinks", label: "Напитки", items: DRINKS },
];

/** Everything a guest picks in the builder. */
export type Build = {
  bun: BunId;
  patties: PattyId[];
  toppings: ToppingId[];
  sauces: SauceId[];
  side?: SideId;
  /** Drink id and the index of its size option. */
  drink?: { id: string; size: number };
};

const find = <T extends Item>(list: readonly T[], id: string) => list.find((i) => i.id === id)!;
export const bun = (id: BunId) => find(BUNS, id);
export const patty = (id: PattyId) => find(PATTIES, id);
export const topping = (id: ToppingId) => find(TOPPINGS, id);
export const sauce = (id: SauceId) => find(SAUCES, id);
export const side = (id: SideId) => find(SIDES, id);
export const drink = (id: string) => find(DRINKS, id);

/** Every line of a build with its price, in the order it is listed on the receipt. */
export function buildLines(b: Build) {
  const lines: { name: string; price: number }[] = [];
  lines.push({ name: `Булочка: ${bun(b.bun).name}`, price: bun(b.bun).options[0].price });
  b.patties.forEach((p) => lines.push({ name: patty(p).name, price: patty(p).options[0].price }));
  b.toppings.forEach((t) => lines.push({ name: topping(t).name, price: topping(t).options[0].price }));
  b.sauces.forEach((s) => lines.push({ name: `Соус ${sauce(s).name}`, price: sauce(s).options[0].price }));
  if (b.side) lines.push({ name: side(b.side).name, price: side(b.side).options[0].price });
  if (b.drink) {
    const d = drink(b.drink.id);
    const o = d.options[b.drink.size];
    lines.push({ name: `${d.name}, ${o.portion}`, price: o.price });
  }
  return lines;
}

export const buildTotal = (b: Build) => buildLines(b).reduce((s, l) => s + l.price, 0);

export type Combo = { id: string; name: string; build: Build };

/** Ready-made combos from the menu. Their prices are the sum of their parts. */
export const COMBOS: Combo[] = [
  {
    id: "classic",
    name: "Классика Self",
    build: { bun: "sesame", patties: ["beef"], toppings: ["cheese", "tomato", "iceberg", "redOnion"], sauces: ["bbq"] },
  },
  {
    id: "country",
    name: "Кантри с курицей",
    build: { bun: "brioche", patties: ["chickenFillet"], toppings: ["cheese", "iceberg", "tomato", "caramelizedOnion"], sauces: ["ranch"] },
  },
  {
    id: "fire",
    name: "Огненный халапеньо",
    build: { bun: "sesame", patties: ["chicken"], toppings: ["jalapeno", "cheese", "onionRings"], sauces: ["piquant"], side: "fries" },
  },
  {
    id: "bbq",
    name: "Томлёный BBQ",
    build: { bun: "brioche", patties: ["pulled"], toppings: ["caramelizedOnion", "cheese", "pickles"], sauces: ["bbq"] },
  },
];

/** Plain-language list of what is inside, as printed on the menu. */
const BUN_SHORT: Record<BunId, string> = { sesame: "Кунжутная булочка", brioche: "Бриошь", black: "Чёрная булочка" };

export function describe(b: Build) {
  const patties = [...new Set(b.patties)].map((p) => {
    const n = b.patties.filter((x) => x === p).length;
    return n > 1 ? `${patty(p).name} ×${n}` : patty(p).name;
  });
  return [
    BUN_SHORT[b.bun],
    ...patties,
    ...b.toppings.map((t) => topping(t).name),
    ...b.sauces.map((s) => {
      const n = sauce(s).name;
      return `соус ${n === n.toUpperCase() ? n : n.toLowerCase()}`;
    }),
    ...(b.side ? [side(b.side).name] : []),
  ]
    .map((s, i) => (i === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1)))
    .join(", ");
}

export const MENU_SIZE = [BUNS, PATTIES, TOPPINGS, SAUCES, SIDES].reduce((n, l) => n + l.length, 0) + DRINKS.reduce((n, d) => n + d.options.length, 0);
