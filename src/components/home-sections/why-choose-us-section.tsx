import { Button } from "@/components/ui/button";
import { CheckCircle, Star } from "lucide-react";
import Link from "next/link";

export function WhyChooseUsSection() {
  const benefits = [
    {
      id: "save-time",
      title: "Save Hours of Study Time",
      description:
        "AI-generated content means no more manual flashcard creation",
      stat: "10+ hours saved weekly",
    },
    {
      id: "improve-retention",
      title: "Improve Retention by 40%",
      description: "Scientifically-backed spaced repetition system",
      stat: "40% better retention",
    },
    {
      id: "personalized-path",
      title: "Personalized Learning Path",
      description: "AI adapts to your learning style and pace",
      stat: "Tailored to you",
    },
    {
      id: "cross-platform",
      title: "Cross-Platform Access",
      description: "Study anywhere, anytime on any device",
      stat: "100% mobile-friendly",
    },
    {
      id: "privacy-design",
      title: "Privacy-First Design",
      description: "Your data stays private and secure",
      stat: "Zero data sharing",
    },
    {
      id: "expert-support",
      title: "Expert Support",
      description: "Get help from our education specialists",
      stat: "24/7 support",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Why Choose StudyLoop?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of students who have already transformed their
              learning experience.
            </p>
            <div className="space-y-6">
              {benefits.map((benefit) => (
                <div key={benefit.id} className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{benefit.title}</h3>
                      <span className="text-sm text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                        {benefit.stat}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 border border-primary/10">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4">Join 10,000+ Students</h3>
              <p className="text-muted-foreground mb-6">
                Already improving their grades with StudyLoop's AI-powered
                learning tools
              </p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={`rating-star-${i + 1}`}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="font-semibold">4.9/5</span>
                <span className="text-muted-foreground">(2,341 reviews)</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">95%</div>
                  <div className="text-sm text-muted-foreground">
                    Grade Improvement
                  </div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">10hrs</div>
                  <div className="text-sm text-muted-foreground">
                    Time Saved Weekly
                  </div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">3+</div>
                  <div className="text-sm text-muted-foreground">
                    Universities
                  </div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">24/7</div>
                  <div className="text-sm text-muted-foreground">
                    AI Assistant
                  </div>
                </div>
              </div>

              <Button
                className="w-full hover:shadow-lg transition-all duration-300 hover:scale-105"
                size="lg"
                asChild
              >
                <Link href="/auth/signup">Get Started Today</Link>
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                ✨ Start free trial • No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
