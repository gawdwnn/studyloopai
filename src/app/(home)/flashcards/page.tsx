import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, BookOpen, Brain, Zap } from "lucide-react";
import Link from "next/link";

export default function FlashcardsDemo() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">
          🧠 AI-Generated Flashcards
        </Badge>
        <h1 className="text-4xl font-bold mb-4">
          Master Any Topic with Smart Flashcards
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload your study materials and let our AI create personalized
          flashcards that adapt to your learning pace and style.
        </p>
      </div>

      {/* Demo Flashcard */}
      <div className="max-w-md mx-auto mb-12">
        <div className="relative">
          <Card className="h-64 cursor-pointer transition-transform hover:scale-105">
            <CardContent className="p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">
                  What is Machine Learning?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click to flip and see the answer
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="absolute -top-2 -right-2">
            <Badge variant="outline" className="bg-background">
              Demo
            </Badge>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>AI-Powered Generation</CardTitle>
            <CardDescription>
              Upload your notes, PDFs, or textbooks and get instant, intelligent
              flashcards
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Spaced Repetition</CardTitle>
            <CardDescription>
              Scientifically-proven algorithm ensures optimal retention and
              long-term memory
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Multiple Formats</CardTitle>
            <CardDescription>
              Support for text, images, equations, and complex diagrams in your
              flashcards
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* How it Works */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Upload Content</h3>
            <p className="text-sm text-muted-foreground">
              Upload your study materials in any format
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">AI Processing</h3>
            <p className="text-sm text-muted-foreground">
              Our AI analyzes and creates relevant flashcards
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Start Learning</h3>
            <p className="text-sm text-muted-foreground">
              Begin studying with personalized flashcards
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
              4
            </div>
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your learning and adapt accordingly
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-4">
          Ready to Create Your First Flashcards?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Join thousands of students who have improved their retention by 40%
          with our AI-powered flashcards.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
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
