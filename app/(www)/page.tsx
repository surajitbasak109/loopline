import Nav from "@/components/Home/Nav";
import Hero from "@/components/Home/Hero";
import Features from "@/components/Home/Features";
import HowItWorks from "@/components/Home/HowItWorks";
import CTA from "@/components/Home/CTA";
import Footer from "@/components/Home/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
