/** Every "Заказать" button on the page scrolls to the order section. */
export const ORDER_URL = "#order";

/**
 * Target of the main "Заказать сейчас" button. Replace with your delivery
 * page, aggregator listing or messenger link before going live.
 */
export const DELIVERY_URL = "#menu";

export const NAV = [
  { href: "#menu", label: "Меню" },
  { href: "#popular", label: "Хиты" },
  { href: "#ingredients", label: "Ингредиенты" },
  { href: "#combo", label: "Комбо" },
  { href: "#about", label: "О бренде" },
] as const;

export const formatPrice = (tenge: number) => `${tenge.toLocaleString("ru-RU")} ₸`;
