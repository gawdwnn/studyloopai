import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Brain,
  Github,
  Linkedin,
  Mail,
  Sparkles,
  Twitter,
  Zap,
} from "lucide-react";
import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="bg-gradient-to-br from-background via-muted/20 to-accent/5 border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl">StudyLoop</span>
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                >
                  AI
                </Badge>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The future of learning is here. Transform your study habits with
                AI-powered tools that adapt to your unique learning style.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="#"
                  className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors group"
                >
                  <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </Link>
                <Link
                  href="#"
                  className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors group"
                >
                  <Linkedin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </Link>
                <Link
                  href="#"
                  className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors group"
                >
                  <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Study Tools */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Study Tools
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/flashcards"
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
                  >
                    Smart Flashcards
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/quizzes"
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
                  >
                    Adaptive Quizzes
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
                  >
                    Study Plan Generator
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      New
                    </Badge>
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
                  >
                    AI Study Assistant
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      Beta
                    </Badge>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Study Tips Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Success Stories
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Stay Updated
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Get weekly study tips, AI insights, and exclusive offers for
                students.
              </p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1"
                  />
                  <Button size="sm" className="px-3">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Join 5,000+ students already subscribed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                © {new Date().getFullYear()} StudyLoop. All rights reserved.
              </span>
              <span className="hidden md:inline">•</span>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <span>•</span>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Powered by</span>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" />
                <span className="font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Advanced AI
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
