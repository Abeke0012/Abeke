import OrderButton from "@/components/cart/OrderButton";
import Logo from "@/components/Logo";
import { INFO, NAV, WHATSAPP_NUMBER } from "@/lib/site";
import { Reveal } from "./ui";

const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`;

const DETAILS: { label: string; value: string; href?: string }[] = [
  { label: "WhatsApp для заказов", value: WHATSAPP_NUMBER, href: WA_LINK },
  { label: "Адрес", value: INFO.address },
  { label: "Режим работы", value: INFO.hours },
  { label: "Доставка", value: `курьер до двери за ${INFO.delivery}` },
  { label: "Самовывоз", value: `готовность за ${INFO.pickupReady}, скидка −${INFO.pickupDiscount}%` },
];

export default function OrderCta() {
  return (
    <>
      <section id="order" className="relative scroll-mt-20 overflow-hidden px-5 py-28 md:px-12 md:py-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(255_106_26/0.28),transparent_70%)]" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
          <Reveal>
            <p className="font-display text-xs font-bold tracking-[0.32em] text-flame">ДОСТАВКА И САМОВЫВОЗ</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-[clamp(2.8rem,9vw,7.5rem)] font-black leading-[0.9] tracking-[-0.03em]">
              Заказать сейчас
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-7 max-w-md text-lg text-smoke">Получаешь как удобно: курьер до двери или самовывоз с нашей точки.</p>
          </Reveal>
          <Reveal delay={0.25} className="w-full">
            <dl className="mx-auto mt-12 grid max-w-4xl gap-px overflow-hidden rounded-3xl bg-line text-left sm:grid-cols-2">
              {DETAILS.map((d) => (
                <div key={d.label} className="bg-coal p-6 sm:first:col-span-2">
                  <dt className="font-display text-xs font-bold tracking-[0.24em] text-smoke">{d.label.toUpperCase()}</dt>
                  <dd className="mt-2 text-lg">
                    {d.href ? (
                      <a href={d.href} target="_blank" rel="noopener noreferrer" className="tabular-nums text-flame underline-offset-4 hover:underline">
                        {d.value}
                      </a>
                    ) : (
                      d.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.3}>
            <OrderButton
              className="mt-12 inline-flex rounded-full bg-flame px-14 py-5 font-display text-sm font-bold tracking-[0.2em] text-coal shadow-[0_0_80px_-10px] shadow-flame/60 transition hover:bg-ink"
            >
              ЗАКАЗАТЬ СЕЙЧАС
            </OrderButton>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-12 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-3">
            <a href="#top" className="w-fit text-3xl" aria-label="SELF — наверх">
              <Logo />
            </a>
            <p className="text-sm text-smoke">
              {INFO.address} · {INFO.hours}
            </p>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="w-fit text-sm tabular-nums text-smoke transition hover:text-flame">
              WhatsApp: {WHATSAPP_NUMBER}
            </a>
          </div>
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
