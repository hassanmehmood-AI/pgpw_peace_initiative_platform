import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <TopNav />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </div>
  );
}
