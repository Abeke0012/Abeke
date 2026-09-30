import type { Build } from "./menu";

/** WhatsApp number that receives orders, in international format (8 708 … → +7 708 …). */
export const WHATSAPP_NUMBER = "+7 708 008 08 53";

/** Restaurant details, as printed on the menu. */
export const INFO = {
  address: "Астана, ул. Бұқарбай батыра, 22",
  hours: "ежедневно, 11:00–05:00",
  delivery: "40 мин – 1 ч",
  pickupReady: "20 минут",
  pickupDiscount: 10,
  priceFrom: 1340,
};

export const NAV = [
  { href: "#builder", label: "Собрать бургер" },
  { href: "#combo", label: "Комбо" },
  { href: "#menu", label: "Меню" },
  { href: "#how", label: "Как это работает" },
  { href: "#order", label: "Доставка" },
] as const;

export const formatPrice = (tenge: number) => `${tenge.toLocaleString("ru-RU")} ₸`;

const LOAD_EVENT = "self:load-build";

/** Opens a ready combo in the builder so the guest can adjust it. */
export function openInBuilder(build: Build) {
  window.dispatchEvent(new CustomEvent<Build>(LOAD_EVENT, { detail: build }));
  document.getElementById("builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function onOpenInBuilder(handler: (b: Build) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<Build>).detail);
  window.addEventListener(LOAD_EVENT, listener);
  return () => window.removeEventListener(LOAD_EVENT, listener);
}
