import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import About from "@/components/sections/About";
import Combos from "@/components/sections/Combos";
import Ingredients from "@/components/sections/Ingredients";
import Menu from "@/components/sections/Menu";
import OrderCta from "@/components/sections/OrderCta";
import Popular from "@/components/sections/Popular";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Menu />
        <Popular />
        <Ingredients />
        <Combos />
        <About />
        <OrderCta />
      </main>
    </>
  );
}
