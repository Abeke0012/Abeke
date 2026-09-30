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
    <>
      <Header />
      <main>
        <Hero />
        <Builder />
        <Combos />
        <Menu />
        <How />
        <About />
        <OrderCta />
      </main>
    </>
  );
}
