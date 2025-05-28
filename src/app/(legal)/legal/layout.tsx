import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-8">
          <ul className="flex space-x-6">
            <li>
              <Link
                href="/legal/terms-of-service"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="/legal/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/legal/cookie-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </li>
          </ul>
        </nav>
        {children}
      </div>
    </div>
  );
}
