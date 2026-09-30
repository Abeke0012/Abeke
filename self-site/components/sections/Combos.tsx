import { COMBOS, comboDetails } from "@/lib/menu";
import { formatPrice, ORDER_URL } from "@/lib/site";
import { Reveal, Section, SectionHeading } from "./ui";

export default function Combos() {
  return (
    <Section id="combo">
      <SectionHeading eyebrow="КОМБО" title="Бургер не ест один" intro="Собрали наборы с картофелем, соусами и напитками. Выходит дешевле, чем по отдельности." />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {COMBOS.map((combo, i) => {
          const { lines, regular, saving } = comboDetails(combo);
          const featured = combo.id === "duo";
          return (
            <Reveal key={combo.id} delay={i * 0.1} className="h-full">
              <article
                className={`flex h-full flex-col rounded-3xl p-7 md:p-9 ${featured ? "bg-flame text-coal" : "bg-char ring-1 ring-inset ring-line"}`}
              >
                <p className={`font-display text-xs font-bold tracking-[0.28em] ${featured ? "text-coal/70" : "text-smoke"}`}>{combo.forWhom.toUpperCase()}</p>
                <h3 className="mt-3 font-display text-4xl font-black tracking-[-0.02em]">{combo.name}</h3>
                <ul className={`mt-7 flex flex-col gap-2.5 ${featured ? "text-coal/85" : "text-ink/85"}`}>
                  {lines.map((l) => (
                    <li key={l.name} className="flex justify-between gap-4">
                      <span>{l.name}</span>
                      <span className="tabular-nums">×{l.qty}</span>
                    </li>
                  ))}
                </ul>
                <div className={`mt-auto border-t pt-6 ${featured ? "border-coal/20" : "border-line"}`}>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <p className={`text-sm line-through tabular-nums ${featured ? "text-coal/60" : "text-smoke"}`}>{formatPrice(regular)}</p>
                      <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(combo.price)}</p>
                    </div>
                    <p className={`rounded-full px-3 py-1.5 text-sm font-medium tabular-nums ${featured ? "bg-coal text-flame" : "bg-flame/15 text-flame"}`}>
                      −{formatPrice(saving)}
                    </p>
                  </div>
                  <a
                    href={ORDER_URL}
                    className={`mt-6 flex w-full justify-center rounded-full py-4 font-display text-xs font-bold tracking-[0.2em] transition ${
                      featured ? "bg-coal text-ink hover:bg-ink hover:text-coal" : "bg-ink text-coal hover:bg-flame"
                    }`}
                  >
                    ЗАКАЗАТЬ {combo.name.toUpperCase()}
                  </a>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
