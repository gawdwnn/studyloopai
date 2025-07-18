"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Brain, GraduationCap, Star, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeroResultsDemo } from "./hero-results-demo";

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
			{/* Subtle Background Elements */}
			<div className="absolute inset-0 -z-10">
				{/* Single Gentle Orb */}
				<motion.div
					className="absolute rounded-full opacity-10"
					style={{
						background:
							"linear-gradient(45deg, var(--homepage-primary), var(--homepage-ai-primary))",
						width: "400px",
						height: "400px",
						top: "20%",
						right: "10%",
					}}
					animate={{
						scale: [1, 1.05, 1],
						rotate: [0, 360],
					}}
					transition={{
						duration: 20,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>
			</div>

			<div className="container mx-auto px-4 relative z-10">
				<motion.div
					className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					{/* Left Column */}
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

							{/* Description */}
							<motion.p
								className="text-xl leading-relaxed max-w-2xl mx-auto lg:mx-0"
								style={{ color: "var(--homepage-muted-foreground)" }}
								variants={itemVariants}
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

						{/* Simple Process Steps */}
						<motion.div
							className="flex flex-row gap-2 sm:gap-4 items-center justify-center lg:justify-start"
							variants={itemVariants}
						>
							{[
								{ icon: Upload, label: "Upload", color: "var(--homepage-primary)" },
								{ icon: Brain, label: "AI Learns", color: "var(--homepage-ai-primary)" },
								{ icon: GraduationCap, label: "You Master", color: "var(--homepage-success)" },
							].map((step, index) => (
								<div key={step.label} className="flex items-center gap-1 sm:gap-3">
									<div className="flex flex-col items-center gap-1 sm:gap-2">
										<div
											className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-lg"
											style={{ backgroundColor: step.color }}
										>
											<step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
										</div>
										<span className="font-medium text-xs sm:text-sm text-center">{step.label}</span>
									</div>
									{index < 2 && (
										<div className="mx-1 sm:mx-2">
											<ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" />
										</div>
									)}
								</div>
							))}
						</motion.div>

						{/* CTA Buttons - Enhanced Primary Focus */}
						<motion.div
							className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
							variants={itemVariants}
						>
							{/* PRIMARY CTA - Enhanced and Focused */}
							<motion.div
								whileHover={{ scale: 1.02, y: -1 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: "spring", stiffness: 400 }}
							>
								<Button
									size="lg"
									className="text-lg px-10 py-7 rounded-xl shadow-2xl font-semibold relative overflow-hidden"
									style={{
										background:
											"linear-gradient(135deg, var(--homepage-primary), var(--homepage-ai-primary))",
										color: "white",
										boxShadow: "0 8px 32px var(--homepage-primary)40",
									}}
									asChild
								>
									<Link href="/auth/signin">
										<span className="relative z-10 flex items-center gap-2">
											Start Learning for Free
											<ArrowRight className="w-5 h-5" />
										</span>
									</Link>
								</Button>
							</motion.div>

							{/* Secondary CTA - Simplified */}
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

						{/* Trust Indicators - Simplified */}
						<motion.div className="space-y-4" variants={itemVariants}>
							<div className="flex items-center justify-center lg:justify-start gap-6 text-sm flex-wrap">
								{["Free forever plan", "Privacy-first design", "Works with any course"].map(
									(feature) => (
										<div key={feature} className="flex items-center gap-2">
											<span className="text-green-500 font-bold">✓</span>
											<span>{feature}</span>
										</div>
									)
								)}
							</div>

							{/* Social Proof */}
							<div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
								<div className="flex">
									{Array.from({ length: 5 }, (_, i) => (
										<Star
											key={`star-rating-${i + 1}`}
											className="w-5 h-5 fill-yellow-400 text-yellow-400"
										/>
									))}
								</div>
								<span className="font-semibold">4.9/5</span>
								<span className="text-sm opacity-75">(100+ students)</span>
							</div>
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
