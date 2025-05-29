import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function QuizzesDemo() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">
          🎯 Adaptive Quizzes
        </Badge>
        <h1 className="text-4xl font-bold mb-4">
          Test Your Knowledge with Smart Quizzes
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Take adaptive quizzes that adjust to your performance level and focus
          on areas that need improvement for maximum learning efficiency.
        </p>
      </div>

      {/* Demo Quiz */}
      <div className="max-w-2xl mx-auto mb-12">
        <Card className="relative">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="bg-background">
                Demo Question
              </Badge>
              <span className="text-sm text-muted-foreground">
                Question 1 of 5
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-xl font-semibold">
              Which of the following is a supervised learning algorithm?
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <span>Linear Regression</span>
                <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                <div className="w-6 h-6 rounded-full border-2" />
                <span>K-Means Clustering</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                <div className="w-6 h-6 rounded-full border-2" />
                <span>Principal Component Analysis</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                <div className="w-6 h-6 rounded-full border-2" />
                <span>DBSCAN</span>
              </div>
            </div>
            <div className="pt-4">
              <Button className="w-full" disabled>
                Next Question →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Adaptive Difficulty</CardTitle>
            <CardDescription>
              Quizzes automatically adjust difficulty based on your performance
              and knowledge level
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Intelligent Feedback</CardTitle>
            <CardDescription>
              Get detailed explanations for each answer to understand concepts
              better
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>
              Track your progress and identify weak areas for focused
              improvement
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Quiz Types */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Quiz Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">Multiple Choice</CardTitle>
              <CardDescription>
                Traditional format with instant feedback
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">True/False</CardTitle>
              <CardDescription>
                Quick assessment of key concepts
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">Fill in Blanks</CardTitle>
              <CardDescription>Test recall and understanding</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">Essay Questions</CardTitle>
              <CardDescription>
                AI-powered evaluation of written responses
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Benefits */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">
          Why Use Our Quizzes?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Immediate Feedback</h3>
                <p className="text-muted-foreground">
                  Get instant explanations for correct and incorrect answers
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Personalized Learning</h3>
                <p className="text-muted-foreground">
                  AI focuses on your weak areas for targeted improvement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Progress Tracking</h3>
                <p className="text-muted-foreground">
                  Monitor your improvement over time with detailed analytics
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Multiple Formats</h3>
                <p className="text-muted-foreground">
                  Various question types to test different aspects of knowledge
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Timed Practice</h3>
                <p className="text-muted-foreground">
                  Prepare for real exams with timed quiz sessions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Smart Scheduling</h3>
                <p className="text-muted-foreground">
                  AI suggests optimal times for quiz sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">Ready to Start Quizzing?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Experience adaptive learning that adjusts to your pace and helps you
          master any subject efficiently.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Start Learning Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
