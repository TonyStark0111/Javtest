import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgeGate from "@/components/AgeGate";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgeGate />
      <Header />
      <main className="wrap main">{children}</main>
      <Footer />
    </>
  );
}
