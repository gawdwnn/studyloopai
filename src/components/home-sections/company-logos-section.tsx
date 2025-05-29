export function CompanyLogosSection() {
  const partners = [
    { name: "MIT", logo: "🎓", id: "mit" },
    { name: "Stanford", logo: "🏛️", id: "stanford" },
    { name: "Harvard", logo: "📚", id: "harvard" },
    { name: "OpenAI", logo: "🤖", id: "openai" },
    { name: "Google", logo: "🔍", id: "google" },
    { name: "Microsoft", logo: "💻", id: "microsoft" },
  ];

  return (
    <section className="py-12 bg-muted/30 border-y">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-8 font-medium">
            Trusted by students and partnered with leading institutions
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center justify-items-center">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-background/50 transition-colors group"
              >
                <div className="text-2xl group-hover:scale-110 transition-transform">
                  {partner.logo}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {partner.name}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>3+ Universities</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>100+ Students</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
