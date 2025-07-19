"use client";

import { ScrollRevealStagger } from "@/components/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Brain, GraduationCap, Star, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function HeroSection() {
	const [typedText, setTypedText] = useState("");
	const [currentWordIndex, setCurrentWordIndex] = useState(0);

	const dynamicWords = useMemo(
		() => ["AI Study Buddy", "Learning Assistant", "Study Companion", "Success Partner"],
		[]
	);

	// Typing animation for dynamic words
	useEffect(() => {
		const currentWord = dynamicWords[currentWordIndex];
		let charIndex = 0;
		setTypedText("");

		const typeInterval = setInterval(() => {
			if (charIndex < currentWord.length) {
				setTypedText(currentWord.slice(0, charIndex + 1));
				charIndex++;
			} else {
				setTimeout(() => {
					setCurrentWordIndex((prev) => (prev + 1) % dynamicWords.length);
				}, 2000);
				clearInterval(typeInterval);
			}
		}, 100);

		return () => clearInterval(typeInterval);
	}, [currentWordIndex, dynamicWords]);

	return (
		<section className="relative overflow-hidden homepage-gradient-bg py-4 lg:py-6 min-h-[calc(100vh-5rem)] flex items-center">
			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-4xl mx-auto text-center">
					<ScrollRevealStagger staggerDelay={0.2}>
						{/* Main Content */}
						<div className="text-center space-y-8 lg:space-y-10">
							{/* Animated Badge */}
							<div>
								<Badge
									variant="secondary"
									className="px-6 py-3 text-sm bg-white/90 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
									style={{
										background:
											"linear-gradient(135deg, var(--homepage-card), var(--homepage-card)90)",
										color: "var(--homepage-primary)",
										boxShadow: "0 8px 32px var(--homepage-primary)20",
									}}
								>
									<motion.span
										animate={{ rotate: [0, 10, -10, 0] }}
										transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
										className="mr-2"
									>
										🤖
									</motion.span>
									Meet Your AI Study Companion
								</Badge>
							</div>

							{/* Dynamic Heading */}
							<div className="space-y-4 lg:space-y-6">
								<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
									<span className="block mb-4 text-foreground">Your Personal</span>

									<div className="block relative min-h-[1.2em]">
										<motion.span
											key={currentWordIndex}
											className="inline-block bg-gradient-to-r bg-clip-text text-transparent"
											style={{
												background:
													"linear-gradient(135deg, var(--homepage-primary), var(--homepage-ai-primary))",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor: "transparent",
											}}
											initial={{ opacity: 0, y: 20, rotateX: -90 }}
											animate={{ opacity: 1, y: 0, rotateX: 0 }}
											exit={{ opacity: 0, y: -20, rotateX: 90 }}
											transition={{ duration: 0.6, ease: "easeOut" }}
										>
											{typedText}
											<motion.span
												className="inline-block w-1 h-14 lg:h-20 ml-2"
												style={{ backgroundColor: "var(--homepage-primary)" }}
												animate={{ opacity: [1, 0, 1] }}
												transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
											/>
										</motion.span>
									</div>
								</h1>

								{/* Description */}
								<div
									className="text-xl lg:text-2xl leading-relaxed max-w-3xl mx-auto"
									style={{ color: "var(--homepage-muted-foreground)" }}
								>
									Transform any course material into{" "}
									<span className="font-semibold" style={{ color: "var(--homepage-primary)" }}>
										personalized quizzes
									</span>
									,{" "}
									<span className="font-semibold" style={{ color: "var(--homepage-ai-primary)" }}>
										smart summaries
									</span>
									, and{" "}
									<span className="font-semibold" style={{ color: "var(--homepage-success)" }}>
										adaptive study plans
									</span>{" "}
									that learn{" "}
									<span className="font-bold relative inline-block">
										your unique style
										<motion.div
											className="absolute bottom-0 left-0 right-0 h-0.5"
											style={{ backgroundColor: "var(--homepage-accent)" }}
											initial={{ scaleX: 0 }}
											animate={{ scaleX: 1 }}
											transition={{ duration: 1, delay: 1.5 }}
										/>
									</span>
								</div>
							</div>

							{/* Simple Process Steps */}
							<div className="flex flex-row gap-4 sm:gap-8 items-center justify-center">
								{[
									{ icon: Upload, label: "Upload", color: "var(--homepage-primary)" },
									{ icon: Brain, label: "AI Learns", color: "var(--homepage-ai-primary)" },
									{ icon: GraduationCap, label: "You Master", color: "var(--homepage-success)" },
								].map((step, index) => (
									<div key={step.label} className="flex items-center gap-2 sm:gap-4">
										<div className="flex flex-col items-center gap-2 sm:gap-3 group cursor-pointer hover:scale-105 transition-transform duration-300">
											<div
												className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl transition-all duration-300"
												style={{ backgroundColor: step.color }}
											>
												<step.icon className="w-6 h-6 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform duration-300" />
											</div>
											<span className="font-medium text-sm sm:text-base text-center group-hover:text-primary transition-colors duration-300">
												{step.label}
											</span>
										</div>
										{index < 2 && (
											<div className="mx-2 sm:mx-4">
												<ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 opacity-60" />
											</div>
										)}
									</div>
								))}
							</div>

							{/* CTA Buttons - Enhanced Primary Focus */}
							<div className="flex justify-center">
								<motion.div
									whileHover={{ scale: 1.02, y: -2 }}
									whileTap={{ scale: 0.98 }}
									transition={{ type: "spring", stiffness: 400, damping: 17 }}
								>
									<Button
										size="lg"
										className="text-xl px-12 py-8 rounded-2xl shadow-2xl font-semibold relative overflow-hidden group hover:shadow-3xl transition-all duration-500"
										style={{
											background:
												"linear-gradient(135deg, var(--homepage-primary), var(--homepage-ai-primary))",
											color: "white",
											boxShadow: "0 8px 32px var(--homepage-primary)40",
										}}
										asChild
									>
										<Link href="/auth/signin">
											<span className="relative z-10 flex items-center gap-3">
												Start Learning for Free
												<ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
											</span>
											{/* Hover shimmer effect */}
											<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-300" />
										</Link>
									</Button>
								</motion.div>
							</div>

							{/* Trust Indicators - Enhanced */}
							<div className="space-y-4 lg:space-y-6">
								<div className="flex items-center justify-center gap-8 text-base flex-wrap">
									{["Free plan", "Privacy-first design", "Works with any course"].map((feature) => (
										<div
											key={feature}
											className="flex items-center gap-3 group hover:scale-105 transition-transform duration-300"
										>
											<span className="text-green-500 font-bold text-lg group-hover:scale-110 transition-transform duration-300">
												✓
											</span>
											<span className="group-hover:text-primary transition-colors duration-300">
												{feature}
											</span>
										</div>
									))}
								</div>

								{/* Social Proof */}
								<div className="flex items-center justify-center gap-6 pt-2">
									<div className="flex">
										{Array.from({ length: 5 }, (_, i) => (
											<Star
												key={`star-rating-${i + 1}`}
												className="w-6 h-6 fill-yellow-400 text-yellow-400 hover:scale-110 transition-transform duration-300"
											/>
										))}
									</div>
									<span className="font-semibold text-lg">4.9/5</span>
									<span className="text-base opacity-75">(100+ students)</span>
								</div>
							</div>
						</div>
					</ScrollRevealStagger>
				</div>
			</div>
		</section>
	);
}
