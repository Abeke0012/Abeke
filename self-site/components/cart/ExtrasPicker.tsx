"use client";

import { drinkKey } from "@/lib/cart";
import { DRINKS, SIDES } from "@/lib/menu";
import { formatPrice } from "@/lib/site";
import { useCart } from "./CartProvider";
import Stepper from "./Stepper";

/** Sides and drinks for the whole order, each with its own quantity. */
export default function ExtrasPicker({ compact = false }: { compact?: boolean }) {
  const { cart, setSide, setDrink } = useCart();
  const head = compact ? "text-xs" : "text-sm";
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className={`mb-2 font-display font-bold tracking-[0.2em] text-smoke ${head}`}>ГАРНИРЫ</p>
        <ul className="flex flex-col divide-y divide-line">
          {SIDES.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm tabular-nums text-smoke">
                  {s.options[0].portion} · {formatPrice(s.options[0].price)}
                </p>
              </div>
              <Stepper label={s.name} value={cart.sides[s.id] ?? 0} onChange={(q) => setSide(s.id, q)} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className={`mb-2 font-display font-bold tracking-[0.2em] text-smoke ${head}`}>НАПИТКИ</p>
        <ul className="flex flex-col divide-y divide-line">
          {DRINKS.map((d) => (
            <li key={d.id} className="py-3">
              <p className="font-medium">{d.name}</p>
              <div className="mt-2 flex flex-col gap-2">
                {d.options.map((o, i) => {
                  const key = drinkKey(d.id, i);
                  return (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <span className="text-sm tabular-nums text-smoke">
                        {o.portion} · {formatPrice(o.price)}
                      </span>
                      <Stepper label={`${d.name} ${o.portion}`} value={cart.drinks[key] ?? 0} onChange={(q) => setDrink(key, q)} />
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
