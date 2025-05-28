"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ArrowRight, Brain, Sparkles, Target, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function HomeNavbar() {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Sparkles className="w-2 h-2 text-yellow-600 absolute top-0.5 left-0.5" />
              </div>
            </div>
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              StudyLoop
            </span>
            <Badge
              variant="secondary"
              className="text-xs px-1.5 sm:px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
            >
              AI
            </Badge>
          </Link>
        </div>

        {/* Center Navigation - Desktop Only */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50">
                <Sparkles className="w-4 h-4 mr-2" />
                Study Tools
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid gap-3 p-6 w-[500px] lg:w-[600px] lg:grid-cols-2">
                  <div className="row-span-3">
                    <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/5 to-primary/10 p-6 no-underline outline-none focus:shadow-md">
                      <div className="mb-2 mt-4 text-lg font-medium">
                        AI-Powered Learning
                      </div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Experience the future of education with personalized AI
                        study tools that adapt to your learning style.
                      </p>
                    </div>
                  </div>
                  <NavigationMenuLink
                    href="/flashcards"
                    className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Brain className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-sm font-medium leading-none">
                        Smart Flashcards
                      </div>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-2">
                      AI-generated flashcards that adapt to your pace and
                      retention patterns
                    </p>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    href="/quizzes"
                    className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Target className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-sm font-medium leading-none">
                        Adaptive Quizzes
                      </div>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-2">
                      Intelligent quizzes that focus on your weak areas for
                      maximum efficiency
                    </p>
                  </NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 relative group"
                >
                  {/* Hamburger Icon */}
                  <div className="w-6 h-6 flex flex-col justify-center items-center">
                    <span
                      className={`block h-0.5 w-6 bg-foreground transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
                      }`}
                    />
                    <span
                      className={`block h-0.5 w-6 bg-foreground transition-all duration-300 ease-in-out my-1 ${
                        isMobileMenuOpen ? "opacity-0" : ""
                      }`}
                    />
                    <span
                      className={`block h-0.5 w-6 bg-foreground transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                      }`}
                    />
                  </div>
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[350px]">
                <div className="flex flex-col space-y-4 mt-4 px-2">
                  {/* Mobile Navigation Header */}
                  <div className="flex items-center justify-between pb-4 border-b px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center">
                        <Brain className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-bold text-lg">StudyLoop</span>
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                      >
                        AI
                      </Badge>
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">
                      Study Tools
                    </h3>

                    <Link
                      href="/flashcards"
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Smart Flashcards</div>
                        <div className="text-sm text-muted-foreground">
                          AI-generated study cards
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>

                    <Link
                      href="/quizzes"
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Adaptive Quizzes</div>
                        <div className="text-sm text-muted-foreground">
                          Intelligent practice tests
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="space-y-3 pt-4 border-t px-2">
                    <Button
                      variant="outline"
                      className="w-full mx-auto"
                      asChild
                    >
                      <Link
                        href="/auth/signin"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    </Button>

                    <Button className="w-full mx-auto" asChild>
                      <Link
                        href="/auth/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Get Started
                        <Zap className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  {/* Theme Toggle */}
                  <div className="flex justify-center pt-4 px-2">
                    <ModeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Actions */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/auth/signin">Sign In</Link>
          </Button>

          <Button
            size="sm"
            asChild
            className="relative overflow-hidden group text-sm px-3 sm:px-4 hidden sm:inline-flex"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Link
              href="/auth/signup"
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <span>Get Started</span>
              <Zap
                className={`w-4 h-4 transition-transform duration-200 ${
                  isHovered ? "scale-110" : ""
                }`}
              />
              {isHovered && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
              )}
            </Link>
          </Button>

          {/* Desktop Theme Toggle */}
          <div className="hidden md:block">
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
