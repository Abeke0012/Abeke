import CartProvider from "@/components/cart/CartProvider";
import Marquee from "@/components/fx/Marquee";
import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import About from "@/components/sections/About";
import Builder from "@/components/sections/Builder";
import Combos from "@/components/sections/Combos";
import How from "@/components/sections/How";
import Menu from "@/components/sections/Menu";
import OrderCta from "@/components/sections/OrderCta";

export default function Home() {
  return (
    <CartProvider>
      <Header />
      <main>
        <Hero />
        <Marquee words={["Твой бургер", "Твои правила", "Burgers made bold"]} />
        <Builder />
        <Combos />
        <Marquee words={["56 позиций", "5 котлет", "15 начинок", "9 соусов"]} tone="dark" tilt={1.5} />
        <Menu />
        <How />
        <About />
        <Marquee words={["Открыто до 05:00", "Доставка", "Самовывоз −10%"]} />
        <OrderCta />
      </main>
    </CartProvider>
  );
}
