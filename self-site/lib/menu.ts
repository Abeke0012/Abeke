import type { LayerKind } from "@/components/hero/burgerGeometry";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  /** Portion weight or volume as printed on the menu. */
  portion: string;
  price: number;
};

export type Burger = MenuItem & {
  /** Layer stack used to render the burger in 3D, bottom to top. */
  stack: LayerKind[];
};

export const BURGERS: Burger[] = [
  {
    id: "classic",
    name: "SELF Classic",
    description: "Говяжья котлета 150 г, чеддер, карамелизированный лук, соус SELF, бриошь.",
    portion: "290 г",
    price: 2990,
    stack: ["bottomBun", "sauce", "patty", "cheese", "onions", "topBun"],
  },
  {
    id: "double",
    name: "Double Bold",
    description: "Две котлеты по 150 г, двойной чеддер, карамелизированный лук, соус SELF.",
    portion: "440 г",
    price: 3990,
    stack: ["bottomBun", "sauce", "patty", "cheese", "patty", "cheese", "onions", "topBun"],
  },
  {
    id: "onion",
    name: "Onion Jam",
    description: "Котлета 150 г, двойная порция лука, томлённого до карамели, чеддер, соус SELF.",
    portion: "330 г",
    price: 3290,
    stack: ["bottomBun", "sauce", "patty", "cheese", "onions", "onions", "topBun"],
  },
  {
    id: "cheese",
    name: "Cheese Lava",
    description: "Котлета 150 г под двумя слоями расплавленного чеддера и соусом SELF.",
    portion: "310 г",
    price: 3190,
    stack: ["bottomBun", "sauce", "patty", "cheese", "cheese", "topBun"],
  },
];

export const SIDES: MenuItem[] = [
  { id: "fries", name: "Картофель фри", description: "Толстая нарезка, морская соль.", portion: "130 г", price: 990 },
  { id: "fries-l", name: "Картофель фри большой", description: "Толстая нарезка, морская соль.", portion: "200 г", price: 1290 },
  { id: "sauce-self", name: "Соус SELF", description: "Сливочный, с копчёной паприкой и горчицей.", portion: "40 г", price: 290 },
  { id: "sauce-cheese", name: "Сырный соус", description: "Тёплый, на выдержанном чеддере.", portion: "40 г", price: 290 },
];

export const DRINKS: MenuItem[] = [
  { id: "shake", name: "Молочный коктейль", description: "Ваниль, шоколад или солёная карамель.", portion: "400 мл", price: 1490 },
  { id: "lemonade", name: "Лимонад SELF", description: "Апельсин, лайм и мята.", portion: "400 мл", price: 990 },
  { id: "cola", name: "Кола", description: "Со льдом.", portion: "500 мл", price: 690 },
];

export const MENU = [
  { id: "burgers", label: "Бургеры", items: BURGERS as MenuItem[] },
  { id: "sides", label: "Картофель и соусы", items: SIDES },
  { id: "drinks", label: "Напитки", items: DRINKS },
] as const;

const byId = Object.fromEntries([...BURGERS, ...SIDES, ...DRINKS].map((i) => [i.id, i]));

export type Combo = {
  id: string;
  name: string;
  forWhom: string;
  /** Item ids with quantities; the regular price is computed from the menu. */
  items: [id: string, qty: number][];
  price: number;
};

export const COMBOS: Combo[] = [
  { id: "solo", name: "Solo", forWhom: "На одного", items: [["classic", 1], ["fries", 1], ["sauce-self", 1], ["cola", 1]], price: 4490 },
  { id: "duo", name: "Duo", forWhom: "На двоих", items: [["classic", 1], ["double", 1], ["fries-l", 2], ["sauce-self", 1], ["sauce-cheese", 1], ["lemonade", 2]], price: 10490 },
  { id: "crew", name: "Crew", forWhom: "На компанию", items: [["classic", 2], ["double", 1], ["onion", 1], ["fries-l", 3], ["sauce-self", 2], ["sauce-cheese", 2]], price: 15990 },
];

export const comboDetails = (combo: Combo) => {
  const lines = combo.items.map(([id, qty]) => ({ name: byId[id].name, qty }));
  const regular = combo.items.reduce((sum, [id, qty]) => sum + byId[id].price * qty, 0);
  return { lines, regular, saving: regular - combo.price };
};
