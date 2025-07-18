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
import {
	ArrowRight,
	Brain,
	Calendar,
	FileQuestion,
	GraduationCap,
	MessageSquare,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeNavbar() {
	const [isHovered, setIsHovered] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 50);
		};

		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('mousemove', handleMouseMove);
		};
	}, []);

	return (
		<header className={`sticky top-0 z-50 w-full transition-all duration-500 ${
			scrolled 
				? 'bg-background/95 backdrop-blur-2xl border-b border-border/50 shadow-lg shadow-black/5' 
				: 'bg-background/80 backdrop-blur-xl border-b border-transparent'
		}`}>
			{/* Animated background gradient that follows mouse */}
			<div 
				className="absolute inset-0 opacity-30 transition-opacity duration-300"
				style={{
					background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, var(--homepage-primary)/10, transparent 40%)`
				}}
			/>
			
			{/* Glass morphism effect */}
			<div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-transparent" />
			
			<div className="relative mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
				{/* Enhanced Logo Section with Magnetic Effect */}
				<div className="flex items-center gap-2 min-w-0 flex-shrink-0">
					<Link href="/" className="flex items-center gap-2 group relative">
						{/* Magnetic hover area */}
						<div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-[var(--homepage-primary)]/5 to-[var(--homepage-ai-primary)]/5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
						
						<div className="relative">
							{/* Main logo with enhanced animations */}
							<div className="w-8 h-8 bg-gradient-to-br from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:shadow-[var(--homepage-primary)]/25">
								<Brain className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-300" />
							</div>
							
							{/* Animated sparkle */}
							<div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--homepage-accent)] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-125 group-hover:animate-pulse">
								<Sparkles className="w-2 h-2 text-white absolute top-0.5 left-0.5 group-hover:rotate-12 transition-transform duration-300" />
							</div>
							
							{/* Orbiting dots */}
							<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
								<div className="absolute w-1 h-1 bg-[var(--homepage-primary)] rounded-full -top-2 left-1/2 transform -translate-x-1/2 group-hover:animate-bounce" />
								<div className="absolute w-1 h-1 bg-[var(--homepage-ai-primary)] rounded-full top-1/2 -right-2 transform -translate-y-1/2 group-hover:animate-pulse" style={{ animationDelay: '0.1s' }} />
								<div className="absolute w-1 h-1 bg-[var(--homepage-accent)] rounded-full -bottom-2 left-1/2 transform -translate-x-1/2 group-hover:animate-bounce" style={{ animationDelay: '0.2s' }} />
							</div>
						</div>
						
						{/* Enhanced text with gradient animation */}
						<span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-foreground via-[var(--homepage-primary)] to-foreground bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[var(--homepage-primary)] group-hover:via-[var(--homepage-ai-primary)] group-hover:to-[var(--homepage-primary)] transition-all duration-500">
							StudyLoop
						</span>
						
						{/* Enhanced AI badge with glow effect */}
						<Badge
							variant="secondary"
							className="text-xs px-1.5 sm:px-2 py-0.5 bg-[var(--homepage-ai-primary)]/10 text-[var(--homepage-ai-primary)] border-[var(--homepage-ai-primary)]/20 group-hover:bg-[var(--homepage-ai-primary)]/20 group-hover:shadow-lg group-hover:shadow-[var(--homepage-ai-primary)]/25 group-hover:scale-105 transition-all duration-300"
						>
							AI
						</Badge>
					</Link>
				</div>

				{/* Center Navigation - Enhanced Desktop Menu */}
				<NavigationMenu className="hidden md:flex">
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuTrigger className="group relative bg-transparent hover:bg-gradient-to-r hover:from-[var(--homepage-primary)]/10 hover:to-[var(--homepage-ai-primary)]/10 data-[state=open]:bg-gradient-to-r data-[state=open]:from-[var(--homepage-primary)]/15 data-[state=open]:to-[var(--homepage-ai-primary)]/15 transition-all duration-300 rounded-lg px-4 py-2 text-sm font-medium">
								<Sparkles className="w-4 h-4 mr-2 text-[var(--homepage-primary)] group-hover:scale-110 group-data-[state=open]:rotate-12 transition-all duration-300" />
								Features
								{/* Subtle glow effect */}
								<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--homepage-primary)]/5 to-[var(--homepage-ai-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							</NavigationMenuTrigger>
							<NavigationMenuContent>
								{/* Enhanced dropdown with glass morphism */}
								<div className="relative backdrop-blur-xl bg-background/95 border border-border/50 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
									{/* Subtle gradient overlay */}
									<div className="absolute inset-0 bg-gradient-to-br from-[var(--homepage-primary)]/5 via-transparent to-[var(--homepage-ai-primary)]/5" />
									
									<div className="relative grid gap-4 p-8 w-[600px] lg:w-[800px] lg:grid-cols-3">
										{/* Featured section with enhanced styling */}
										<div className="row-span-3">
											<div className="group relative flex h-full w-full select-none flex-col justify-end rounded-xl bg-gradient-to-br from-[var(--homepage-primary)]/10 via-[var(--homepage-ai-primary)]/5 to-[var(--homepage-accent)]/10 p-6 no-underline outline-none hover:shadow-lg transition-all duration-500 hover:scale-[1.02]">
												{/* Background pattern */}
												<div className="absolute inset-0 rounded-xl opacity-30">
													<div className="absolute top-4 right-4 w-8 h-8 border border-current/20 rounded-full" />
													<div className="absolute bottom-6 left-4 w-4 h-4 border border-current/20 rotate-45" />
												</div>
												
												<div className="relative z-10">
													<div className="mb-2 mt-4 text-lg font-semibold bg-gradient-to-r from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] bg-clip-text text-transparent">
														AI-Powered Learning
													</div>
													<p className="text-sm leading-relaxed text-muted-foreground">
														Experience the future of education with personalized AI study tools that
														adapt to your learning style and accelerate your success.
													</p>
												</div>
											</div>
										</div>
										{/* Enhanced navigation links */}
										<NavigationMenuLink
											href="/dashboard/adaptive-learning/quizzes"
											className="group block select-none space-y-1 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-600/5 focus:bg-gradient-to-r focus:from-blue-500/10 focus:to-blue-600/5 hover:scale-105 hover:shadow-lg border border-transparent hover:border-blue-500/20"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
													<FileQuestion className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-semibold leading-none mb-1">Smart Quizzes</div>
													<p className="text-xs text-muted-foreground">AI-adaptive learning</p>
												</div>
												<ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-blue-600" />
											</div>
										</NavigationMenuLink>

										<NavigationMenuLink
											href="/dashboard/adaptive-learning/cuecards"
											className="group block select-none space-y-1 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-gradient-to-r hover:from-green-500/10 hover:to-green-600/5 focus:bg-gradient-to-r focus:from-green-500/10 focus:to-green-600/5 hover:scale-105 hover:shadow-lg border border-transparent hover:border-green-500/20"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
													<Brain className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-semibold leading-none mb-1">Smart Cuecards</div>
													<p className="text-xs text-muted-foreground">Memory enhancement</p>
												</div>
												<ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-green-600" />
											</div>
										</NavigationMenuLink>

										<NavigationMenuLink
											href="/dashboard/course-planner"
											className="group block select-none space-y-1 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-purple-600/5 focus:bg-gradient-to-r focus:from-purple-500/10 focus:to-purple-600/5 hover:scale-105 hover:shadow-lg border border-transparent hover:border-purple-500/20"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
													<Calendar className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-semibold leading-none mb-1">Course Planner</div>
													<p className="text-xs text-muted-foreground">Smart scheduling</p>
												</div>
												<ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-purple-600" />
											</div>
										</NavigationMenuLink>

										<NavigationMenuLink
											href="/dashboard/adaptive-learning/multiple-choice"
											className="group block select-none space-y-1 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-orange-600/5 focus:bg-gradient-to-r focus:from-orange-500/10 focus:to-orange-600/5 hover:scale-105 hover:shadow-lg border border-transparent hover:border-orange-500/20"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
													<GraduationCap className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-semibold leading-none mb-1">Multiple Choice</div>
													<p className="text-xs text-muted-foreground">Practice tests</p>
												</div>
												<ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-orange-600" />
											</div>
										</NavigationMenuLink>

										<NavigationMenuLink
											href="/dashboard/adaptive-learning/open-questions"
											className="group block select-none space-y-1 rounded-xl p-4 leading-none no-underline outline-none transition-all duration-300 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-pink-600/5 focus:bg-gradient-to-r focus:from-pink-500/10 focus:to-pink-600/5 hover:scale-105 hover:shadow-lg border border-transparent hover:border-pink-500/20"
										>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
													<MessageSquare className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform duration-300" />
												</div>
												<div className="flex-1">
													<div className="text-sm font-semibold leading-none mb-1">Open Questions</div>
													<p className="text-xs text-muted-foreground">Deep learning</p>
												</div>
												<ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-pink-600" />
											</div>
										</NavigationMenuLink>
									</div>
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
								<Button variant="ghost" size="sm" className="h-10 w-10 p-0 relative group">
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
							<SheetContent side="right" className="w-full sm:w-[350px] backdrop-blur-xl bg-background/95 border-l border-border/50">
								{/* Subtle gradient overlay for mobile menu */}
								<div className="absolute inset-0 bg-gradient-to-br from-[var(--homepage-primary)]/5 via-transparent to-[var(--homepage-ai-primary)]/5" />
								
								<div className="relative flex flex-col space-y-4 mt-4 px-2">
									{/* Enhanced Mobile Navigation Header */}
									<div className="flex items-center justify-between pb-4 border-b border-border/50 px-2">
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 bg-gradient-to-br from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] rounded-lg flex items-center justify-center shadow-lg">
												<Brain className="w-4 h-4 text-white" />
											</div>
											<span className="font-bold text-xl bg-gradient-to-r from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] bg-clip-text text-transparent">StudyLoop</span>
											<Badge
												variant="secondary"
												className="text-xs px-2 py-1 bg-[var(--homepage-ai-primary)]/10 text-[var(--homepage-ai-primary)] border-[var(--homepage-ai-primary)]/20 shadow-sm"
											>
												AI
											</Badge>
										</div>
									</div>

									{/* Enhanced Navigation Items */}
									<div className="space-y-2">
										<h3 className="text-sm font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
											Features
										</h3>

										<Link
											href="/dashboard/adaptive-learning/quizzes"
											className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-600/5 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-blue-500/20 hover:shadow-lg"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
												<FileQuestion className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
											</div>
											<div className="flex-1">
												<div className="font-semibold">Smart Quizzes</div>
												<div className="text-sm text-muted-foreground">AI-adaptive quizzes</div>
											</div>
											<ArrowRight className="w-4 h-4 text-blue-600 opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
										</Link>

										<Link
											href="/dashboard/adaptive-learning/cuecards"
											className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-green-500/10 hover:to-green-600/5 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-green-500/20 hover:shadow-lg"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
												<Brain className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
											</div>
											<div className="flex-1">
												<div className="font-semibold">Smart Cuecards</div>
												<div className="text-sm text-muted-foreground">AI-generated cards</div>
											</div>
											<ArrowRight className="w-4 h-4 text-green-600 opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
										</Link>

										<Link
											href="/dashboard/course-planner"
											className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-purple-600/5 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-purple-500/20 hover:shadow-lg"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
												<Calendar className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
											</div>
											<div className="flex-1">
												<div className="font-semibold">Course Planner</div>
												<div className="text-sm text-muted-foreground">Study planning</div>
											</div>
											<ArrowRight className="w-4 h-4 text-purple-600 opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
										</Link>

										<Link
											href="/dashboard/adaptive-learning/multiple-choice"
											className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-orange-600/5 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-orange-500/20 hover:shadow-lg"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
												<GraduationCap className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform duration-300" />
											</div>
											<div className="flex-1">
												<div className="font-semibold">Multiple Choice</div>
												<div className="text-sm text-muted-foreground">Practice questions</div>
											</div>
											<ArrowRight className="w-4 h-4 text-orange-600 opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
										</Link>

										<Link
											href="/dashboard/adaptive-learning/open-questions"
											className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-pink-600/5 hover:scale-105 transition-all duration-300 group border border-transparent hover:border-pink-500/20 hover:shadow-lg"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
												<MessageSquare className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform duration-300" />
											</div>
											<div className="flex-1">
												<div className="font-semibold">Open Questions</div>
												<div className="text-sm text-muted-foreground">Deep learning</div>
											</div>
											<ArrowRight className="w-4 h-4 text-pink-600 opacity-75 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
										</Link>
									</div>

									{/* Enhanced Mobile Action Buttons */}
									<div className="space-y-3 pt-4 border-t border-border/50 px-2">
										<Button 
											variant="outline" 
											className="w-full mx-auto group hover:bg-gradient-to-r hover:from-[var(--homepage-primary)]/10 hover:to-[var(--homepage-ai-primary)]/10 border-border/50 hover:border-[var(--homepage-primary)]/30 transition-all duration-300" 
											asChild
										>
											<Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)} className="relative">
												<span className="relative z-10">Sign In</span>
												<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--homepage-primary)]/5 to-[var(--homepage-ai-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
											</Link>
										</Button>

										<Button 
											className="w-full mx-auto relative overflow-hidden group bg-gradient-to-r from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] hover:from-[var(--homepage-primary)]/90 hover:to-[var(--homepage-ai-primary)]/90 text-white border-0 shadow-lg hover:shadow-xl hover:shadow-[var(--homepage-primary)]/25 transition-all duration-300 hover:scale-105" 
											asChild
										>
											<Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 relative z-10">
												<span className="font-medium">Get Started</span>
												<Zap className="w-4 h-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
												{/* Subtle glow effect */}
												<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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

					{/* Enhanced Desktop Actions */}
					<Button 
						variant="ghost" 
						size="sm" 
						asChild 
						className="hidden sm:inline-flex relative group hover:bg-gradient-to-r hover:from-[var(--homepage-primary)]/10 hover:to-[var(--homepage-ai-primary)]/10 transition-all duration-300 rounded-lg"
					>
						<Link href="/auth/signin" className="relative">
							<span className="relative z-10">Sign In</span>
							{/* Subtle hover effect */}
							<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[var(--homepage-primary)]/5 to-[var(--homepage-ai-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						</Link>
					</Button>

					<Button
						size="sm"
						asChild
						className="relative overflow-hidden group text-sm px-4 sm:px-6 py-2 hidden sm:inline-flex bg-gradient-to-r from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] hover:from-[var(--homepage-primary)]/90 hover:to-[var(--homepage-ai-primary)]/90 text-white border-0 shadow-lg hover:shadow-xl hover:shadow-[var(--homepage-primary)]/25 transition-all duration-300 rounded-lg hover:scale-105"
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
					>
						<Link href="/auth/signin" className="flex items-center gap-2 relative z-10">
							<span className="font-medium">Get Started</span>
							<Zap
								className={`w-4 h-4 transition-all duration-300 ${
									isHovered ? "scale-110 rotate-12" : ""
								}`}
							/>
							{/* Enhanced shimmer effect */}
							{isHovered && (
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-shimmer" />
							)}
							{/* Subtle glow effect */}
							<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
