"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Brain, GraduationCap, Sparkles, Star, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroResultsDemo } from "./hero-results-demo";

export function HeroSection() {
	const [typedText, setTypedText] = useState("");
	const [currentWordIndex, setCurrentWordIndex] = useState(0);

	const dynamicWords = [
		"AI Study Buddy",
		"Learning Assistant",
		"Study Companion",
		"Success Partner",
	];

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
	}, [currentWordIndex]);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.2,
				delayChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 30 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.8,
				ease: "easeOut",
			},
		},
	};

	return (
		<section className="relative overflow-hidden homepage-gradient-bg py-20 lg:py-32 min-h-[90vh] flex items-center">
			{/* Animated Background Elements */}
			<div className="absolute inset-0 -z-10">
				{/* Floating Orbs */}
				{Array.from({ length: 6 }, (_, i) => (
					<motion.div
						key={`bg-orb-${i}-${60 + i * 20}`}
						className="absolute rounded-full opacity-20"
						style={{
							background:
								"linear-gradient(45deg, var(--homepage-primary), var(--homepage-ai-primary))",
							width: `${60 + i * 20}px`,
							height: `${60 + i * 20}px`,
							top: `${20 + Math.sin(i * 1.5) * 30}%`,
							left: `${10 + Math.cos(i * 1.5) * 80}%`,
						}}
						animate={{
							x: [0, 30, 0],
							y: [0, -20, 0],
							scale: [1, 1.1, 1],
						}}
						transition={{
							duration: 4 + i * 0.5,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
							delay: i * 0.3,
						}}
					/>
				))}

				{/* Sparkle Particles */}
				{Array.from({ length: 12 }, (_, i) => (
					<motion.div
						key={`bg-sparkle-${i}-${Math.random()}`}
						className="absolute"
						style={{
							top: `${Math.random() * 100}%`,
							left: `${Math.random() * 100}%`,
						}}
						animate={{
							opacity: [0, 1, 0],
							scale: [0, 1, 0],
							rotate: [0, 180, 360],
						}}
						transition={{
							duration: 3,
							repeat: Number.POSITIVE_INFINITY,
							delay: i * 0.2,
							ease: "easeInOut",
						}}
					>
						<Sparkles className="w-4 h-4 text-yellow-400" />
					</motion.div>
				))}
			</div>

			<div className="container mx-auto px-4 relative z-10">
				<motion.div
					className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					{/* Left Column - Enhanced Content */}
					<motion.div className="text-center lg:text-left space-y-8" variants={itemVariants}>
						{/* Animated Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
							animate={{ opacity: 1, scale: 1, rotate: 0 }}
							transition={{ duration: 0.6, ease: "easeOut" }}
						>
							<Badge
								variant="secondary"
								className="mb-6 px-4 py-2 text-sm bg-white/90 backdrop-blur-md border-0 shadow-lg"
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
						</motion.div>

						{/* Dynamic Heading */}
						<div className="space-y-4">
							<motion.h1
								className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight"
								variants={itemVariants}
							>
								<motion.span
									className="block mb-2"
									initial={{ opacity: 0, x: -50 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.8, delay: 0.2 }}
								>
									Your Personal
								</motion.span>

								<motion.div
									className="block relative min-h-[1.2em]"
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.8, delay: 0.4 }}
								>
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
											className="inline-block w-1 h-12 lg:h-16 ml-2"
											style={{ backgroundColor: "var(--homepage-primary)" }}
											animate={{ opacity: [1, 0, 1] }}
											transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
										/>
									</motion.span>
								</motion.div>
							</motion.h1>

							{/* Enhanced Description */}
							<motion.p
								className="text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0"
								style={{ color: "var(--homepage-muted-foreground)" }}
								variants={itemVariants}
							>
								Transform any course material into{" "}
								<motion.span
									className="font-semibold"
									style={{ color: "var(--homepage-primary)" }}
									animate={{ scale: [1, 1.05, 1] }}
									transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
								>
									personalized quizzes
								</motion.span>
								,{" "}
								<motion.span
									className="font-semibold"
									style={{ color: "var(--homepage-ai-primary)" }}
									animate={{ scale: [1, 1.05, 1] }}
									transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
								>
									smart summaries
								</motion.span>
								, and{" "}
								<motion.span
									className="font-semibold"
									style={{ color: "var(--homepage-success)" }}
									animate={{ scale: [1, 1.05, 1] }}
									transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 1 }}
								>
									adaptive study plans
								</motion.span>{" "}
								that learn{" "}
								<em className="font-bold not-italic relative">
									your unique style
									<motion.div
										className="absolute bottom-0 left-0 right-0 h-0.5"
										style={{ backgroundColor: "var(--homepage-accent)" }}
										initial={{ scaleX: 0 }}
										animate={{ scaleX: 1 }}
										transition={{ duration: 1, delay: 1.5 }}
									/>
								</em>
							</motion.p>
						</div>

						{/* Animated Process Steps */}
						<motion.div
							className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start"
							variants={itemVariants}
						>
							{[
								{ icon: Upload, label: "Upload", color: "var(--homepage-primary)" },
								{ icon: Brain, label: "AI Learns", color: "var(--homepage-ai-primary)" },
								{ icon: GraduationCap, label: "You Master", color: "var(--homepage-success)" },
							].map((step, index) => (
								<motion.div
									key={step.label}
									className="flex items-center gap-3"
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										duration: 0.5,
										delay: 0.8 + index * 0.2,
										type: "spring",
										stiffness: 200,
									}}
								>
									<motion.div
										className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
										style={{ backgroundColor: step.color }}
										whileHover={{ scale: 1.1, rotate: 10 }}
										whileTap={{ scale: 0.95 }}
									>
										<step.icon className="w-6 h-6" />
									</motion.div>
									<span className="font-medium text-sm">{step.label}</span>
									{index < 2 && (
										<motion.div
											initial={{ scaleX: 0 }}
											animate={{ scaleX: 1 }}
											transition={{ duration: 0.5, delay: 1.2 + index * 0.2 }}
											className="hidden sm:block"
										>
											<ArrowRight className="w-5 h-5 opacity-60" />
										</motion.div>
									)}
								</motion.div>
							))}
						</motion.div>

						{/* Enhanced CTA Buttons */}
						<motion.div
							className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
							variants={itemVariants}
						>
							<motion.div
								whileHover={{ scale: 1.05, y: -2 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: "spring", stiffness: 400 }}
							>
								<Button
									size="lg"
									className="text-lg px-8 py-6 rounded-xl shadow-xl relative overflow-hidden group"
									style={{
										background:
											"linear-gradient(135deg, var(--homepage-primary), var(--homepage-ai-primary))",
										color: "white",
									}}
									asChild
								>
									<Link href="/auth/signin">
										<motion.div
											className="absolute inset-0 bg-white/20"
											initial={{ x: "-100%" }}
											whileHover={{ x: "100%" }}
											transition={{ duration: 0.5 }}
										/>
										<span className="relative z-10 flex items-center gap-2">
											Start Learning for Free
											<motion.div
												animate={{ x: [0, 4, 0] }}
												transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
											>
												<ArrowRight className="w-5 h-5" />
											</motion.div>
										</span>
									</Link>
								</Button>
							</motion.div>

							<motion.div
								whileHover={{ scale: 1.05, y: -2 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: "spring", stiffness: 400 }}
							>
								<Button
									size="lg"
									variant="outline"
									className="text-lg px-8 py-6 rounded-xl shadow-lg backdrop-blur-sm bg-white/50"
									style={{
										borderColor: "var(--homepage-primary)",
										color: "var(--homepage-primary)",
									}}
									asChild
								>
									<Link href="/cuecards">
										<Zap className="w-5 h-5 mr-2" />
										See Demo
									</Link>
								</Button>
							</motion.div>
						</motion.div>

						{/* Enhanced Trust Indicators */}
						<motion.div className="space-y-4" variants={itemVariants}>
							<div className="flex items-center justify-center lg:justify-start gap-6 text-sm flex-wrap">
								{["Free forever plan", "Privacy-first design", "Works with any course"].map(
									(feature, index) => (
										<motion.div
											key={feature}
											className="flex items-center gap-2"
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
										>
											<motion.span
												className="text-green-500 font-bold"
												animate={{ scale: [1, 1.2, 1] }}
												transition={{
													duration: 2,
													repeat: Number.POSITIVE_INFINITY,
													delay: index * 0.3,
												}}
											>
												✓
											</motion.span>
											<span>{feature}</span>
										</motion.div>
									)
								)}
							</div>

							{/* Social Proof */}
							<motion.div
								className="flex items-center justify-center lg:justify-start gap-4 pt-4"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.5, delay: 2 }}
							>
								<div className="flex">
									{Array.from({ length: 5 }, (_, i) => (
										<motion.div
											key={`star-rating-${i}`}
											initial={{ opacity: 0, rotate: -180 }}
											animate={{ opacity: 1, rotate: 0 }}
											transition={{
												duration: 0.5,
												delay: 2.2 + i * 0.1,
												type: "spring",
											}}
										>
											<Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
										</motion.div>
									))}
								</div>
								<motion.span
									className="font-semibold"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 2.7 }}
								>
									4.9/5
								</motion.span>
								<motion.span
									className="text-sm opacity-75"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 2.9 }}
								>
									(500+ students)
								</motion.span>
							</motion.div>
						</motion.div>
					</motion.div>

					{/* Right Column - Results Dashboard Demo */}
					<motion.div
						className="flex justify-center lg:justify-end"
						variants={itemVariants}
						initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
						animate={{ opacity: 1, scale: 1, rotateY: 0 }}
						transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
					>
						<HeroResultsDemo />
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}
