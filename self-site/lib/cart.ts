import { buildTotal, describe, drink, side, type Build, type SideId } from "./menu";
import { formatPrice, INFO, WHATSAPP_NUMBER } from "./site";

/** One burger in the order: its layers (no side or drink) and how many. */
export type CartBurger = { id: string; name: string; build: Build; qty: number };

export type Cart = {
  burgers: CartBurger[];
  /** Side id → quantity. */
  sides: Partial<Record<SideId, number>>;
  /** "drinkId:sizeIndex" → quantity. */
  drinks: Record<string, number>;
  mode: "delivery" | "pickup";
  address: string;
  comment: string;
};

export const EMPTY_CART: Cart = { burgers: [], sides: {}, drinks: {}, mode: "delivery", address: "", comment: "" };

export const burgerPrice = (b: Build) => buildTotal({ ...b, side: undefined, drink: undefined });

export const drinkKey = (id: string, size: number) => `${id}:${size}`;
export const parseDrinkKey = (key: string) => {
  const [id, size] = key.split(":");
  return { id, size: Number(size) };
};

export function extrasLines(cart: Cart) {
  const lines: { name: string; qty: number; price: number }[] = [];
  for (const [id, qty] of Object.entries(cart.sides)) {
    if (!qty) continue;
    const s = side(id as SideId);
    lines.push({ name: s.name, qty, price: s.options[0].price });
  }
  for (const [key, qty] of Object.entries(cart.drinks)) {
    if (!qty) continue;
    const { id, size } = parseDrinkKey(key);
    const d = drink(id);
    lines.push({ name: `${d.name}, ${d.options[size].portion}`, qty, price: d.options[size].price });
  }
  return lines;
}

export function cartTotals(cart: Cart) {
  const burgers = cart.burgers.reduce((s, b) => s + burgerPrice(b.build) * b.qty, 0);
  const extras = extrasLines(cart).reduce((s, l) => s + l.price * l.qty, 0);
  const subtotal = burgers + extras;
  const discount = cart.mode === "pickup" ? Math.round((subtotal * INFO.pickupDiscount) / 100) : 0;
  return { subtotal, discount, total: subtotal - discount };
}

export const cartCount = (cart: Cart) =>
  cart.burgers.reduce((n, b) => n + b.qty, 0) + extrasLines(cart).reduce((n, l) => n + l.qty, 0);

/** Order text the guest sends to the restaurant in WhatsApp. */
export function whatsappText(cart: Cart) {
  const out: string[] = ["Здравствуйте! Заказ с сайта SELF:", ""];
  cart.burgers.forEach((b, i) => {
    const price = burgerPrice(b.build);
    out.push(`${i + 1}. ${b.name} ×${b.qty} — ${formatPrice(price * b.qty)}`);
    out.push(`   ${describe({ ...b.build, side: undefined })}`);
  });
  const extras = extrasLines(cart);
  if (extras.length) {
    out.push("", "Гарниры и напитки:");
    extras.forEach((l) => out.push(`• ${l.name} ×${l.qty} — ${formatPrice(l.price * l.qty)}`));
  }
  const t = cartTotals(cart);
  out.push("");
  if (cart.mode === "pickup") {
    out.push(`Самовывоз: ${INFO.address} (скидка −${INFO.pickupDiscount}%: −${formatPrice(t.discount)})`);
  } else {
    out.push(`Доставка по адресу: ${cart.address.trim() || "уточню в чате"}`);
  }
  if (cart.comment.trim()) out.push(`Комментарий: ${cart.comment.trim()}`);
  out.push(`Итого: ${formatPrice(t.total)}`);
  return out.join("\n");
}

export function whatsappUrl(cart: Cart) {
  const phone = WHATSAPP_NUMBER.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText(cart))}`;
}
