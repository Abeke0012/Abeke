import Logo from "@/components/Logo";
import { DELIVERY_URL, NAV } from "@/lib/site";
import { Reveal } from "./ui";

export default function OrderCta() {
  return (
    <>
      <section id="order" className="relative scroll-mt-20 overflow-hidden px-5 py-28 md:px-12 md:py-44">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(255_106_26/0.28),transparent_70%)]" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
          <Reveal>
            <p className="font-display text-xs font-bold tracking-[0.32em] text-flame">ГОЛОДНЫ?</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-[clamp(2.8rem,9vw,7.5rem)] font-black leading-[0.9] tracking-[-0.03em]">
              Заказать сейчас
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-7 max-w-md text-lg text-smoke">Горячим в фирменной коробке SELF — с картофелем фри и соусом.</p>
          </Reveal>
          <Reveal delay={0.3}>
            <a
              href={DELIVERY_URL}
              className="mt-10 inline-flex rounded-full bg-flame px-14 py-5 font-display text-sm font-bold tracking-[0.2em] text-coal shadow-[0_0_80px_-10px] shadow-flame/60 transition hover:bg-ink"
            >
              ЗАКАЗАТЬ СЕЙЧАС
            </a>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-12 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <a href="#top" className="text-3xl" aria-label="SELF — наверх">
            <Logo />
          </a>
          <nav aria-label="Разделы" className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-smoke">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-ink">
                {item.label}
              </a>
            ))}
          </nav>
          <p className="text-sm text-smoke">© {new Date().getFullYear()} SELF Burgers</p>
        </div>
      </footer>
    </>
  );
}
