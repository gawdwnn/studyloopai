import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Brain, Target, TrendingUp, Users, Zap } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      id: "ai-materials",
      icon: Brain,
      title: "AI-Generated Study Materials",
      description:
        "Upload your course materials and get instant, intelligent summaries and flashcards tailored to your learning objectives",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "adaptive-learning",
      icon: Target,
      title: "Adaptive Learning System",
      description:
        "Smart quizzes and flashcards that adjust difficulty based on your performance and focus on areas that need improvement",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      id: "study-plans",
      icon: TrendingUp,
      title: "Personalized Study Plans",
      description:
        "Get a customized study schedule that adapts to your course deadlines and learning progress",
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      id: "privacy-first",
      icon: Zap,
      title: "Privacy-First Design",
      description:
        "Your study materials stay private. We never use your content to train our AI models",
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
    },
    {
      id: "gamified-learning",
      icon: BookOpen,
      title: "Gamified Learning",
      description:
        "Earn XP, maintain streaks, and compete with classmates while mastering your subjects",
      color: "text-red-600",
      bgColor: "bg-red-500/10",
    },
    {
      id: "academic-integration",
      icon: Users,
      title: "Academic Integration",
      description:
        "Seamlessly works with your university courses and learning management systems",
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Why Students Choose StudyLoop
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered platform adapts to your learning style and helps you
            study more effectively, just like having a personal tutor
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.id}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div
                  className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Feature Highlight */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">
              Save 10+ hours per week with AI-powered study tools
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
