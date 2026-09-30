"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_CART, type Cart, type CartBurger } from "@/lib/cart";
import type { Build, Combo, SideId } from "@/lib/menu";
import CartDrawer from "./CartDrawer";

const STORAGE_KEY = "self-cart-v1";

type CartApi = {
  cart: Cart;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Adds a burger (its side and drink, if any, go to the extras). Returns its name. */
  addBurger: (build: Build, name?: string) => string;
  addCombo: (combo: Combo) => void;
  setBurgerQty: (id: string, qty: number) => void;
  setSide: (id: SideId, qty: number) => void;
  setDrink: (key: string, qty: number) => void;
  update: (patch: Partial<Pick<Cart, "mode" | "address" | "comment">>) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

export function useCart() {
  const api = useContext(CartContext);
  if (!api) throw new Error("useCart must be used inside <CartProvider>");
  return api;
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [isOpen, setOpen] = useState(false);

  // Keep the order across reloads; storage can be unavailable (private mode, blocked site data).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCart({ ...EMPTY_CART, ...JSON.parse(saved) });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const latest = useRef(cart);
  latest.current = cart;

  const addBurger = useCallback((build: Build, name?: string) => {
    const own = latest.current.burgers.filter((b) => b.name.startsWith("Свой бургер")).length;
    const label = name ?? `Свой бургер №${own + 1}`;
    setCart((c) => {
      const burger: CartBurger = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: label,
        build: { bun: build.bun, patties: [...build.patties], toppings: [...build.toppings], sauces: [...build.sauces] },
        qty: 1,
      };
      const sides = { ...c.sides };
      if (build.side) sides[build.side] = (sides[build.side] ?? 0) + 1;
      const drinks = { ...c.drinks };
      if (build.drink) {
        const key = `${build.drink.id}:${build.drink.size}`;
        drinks[key] = (drinks[key] ?? 0) + 1;
      }
      return { ...c, burgers: [...c.burgers, burger], sides, drinks };
    });
    return label;
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      cart,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      addBurger,
      addCombo: (combo) => {
        addBurger(combo.build, combo.name);
        setOpen(true);
      },
      setBurgerQty: (id, qty) =>
        setCart((c) => ({ ...c, burgers: qty <= 0 ? c.burgers.filter((b) => b.id !== id) : c.burgers.map((b) => (b.id === id ? { ...b, qty } : b)) })),
      setSide: (id, qty) => setCart((c) => ({ ...c, sides: { ...c.sides, [id]: Math.max(0, qty) } })),
      setDrink: (key, qty) => setCart((c) => ({ ...c, drinks: { ...c.drinks, [key]: Math.max(0, qty) } })),
      update: (patch) => setCart((c) => ({ ...c, ...patch })),
      clear: () => setCart(EMPTY_CART),
    }),
    [cart, isOpen, addBurger],
  );

  return (
    <CartContext.Provider value={api}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}
