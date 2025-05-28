import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | StudyLoop AI",
  description: "Latest articles and updates from StudyLoop AI",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">StudyLoop AI Blog</h1>
          <p className="text-muted-foreground text-lg">
            Insights, tips, and updates about AI-powered learning
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
