import { HomeFooter } from "@/components/home-sections/home-footer";
import { HomeNavbar } from "@/components/home-sections/home-navbar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <HomeNavbar />
      <main className="flex-1">{children}</main>
      <HomeFooter />
    </div>
  );
}
