"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
	ArrowRight,
	BookOpen,
	Brain,
	GraduationCap,
	TrendingUp,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

// Animated Shapes Component
function AnimatedShapes({
	shapesRef,
}: { shapesRef: React.RefObject<HTMLDivElement | null> }) {
	return (
		<div
			ref={shapesRef}
			className="absolute inset-0 overflow-hidden pointer-events-none"
		>
			{/* Large gradient circles */}
			<div
				className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
				style={{
					background:
						"radial-gradient(circle, var(--homepage-primary)40, transparent 70%)",
					transform: "translate(-50%, -50%)",
				}}
			/>
			<div
				className="absolute top-3/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-2xl"
				style={{
					background:
						"radial-gradient(circle, var(--homepage-ai-primary)40, transparent 70%)",
					transform: "translate(50%, -50%)",
				}}
			/>

			{/* Floating geometric shapes */}
			<div className="absolute top-1/4 left-1/12 w-16 h-16 opacity-20">
				<div
					className="w-full h-full rounded-lg"
					style={{
						background:
							"linear-gradient(45deg, var(--homepage-primary), var(--homepage-ai-primary))",
						boxShadow: "0 8px 32px var(--homepage-primary)20",
					}}
				/>
			</div>

			<div className="absolute top-1/2 right-1/12 w-12 h-12 opacity-15">
				<div
					className="w-full h-full"
					style={{
						background: "var(--homepage-success)",
						clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
						boxShadow: "0 6px 24px var(--homepage-success)30",
					}}
				/>
			</div>

			<div className="absolute top-1/5 right-1/6 w-8 h-8 opacity-20">
				<div
					className="w-full h-full rounded-full"
					style={{
						background: "var(--homepage-accent)",
						boxShadow: "0 4px 16px var(--homepage-accent)40",
					}}
				/>
			</div>

			<div className="absolute bottom-1/4 left-1/6 w-14 h-14 opacity-15">
				<div
					className="w-full h-full"
					style={{
						background:
							"linear-gradient(135deg, var(--homepage-ai-primary), var(--homepage-primary))",
						clipPath: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)",
						boxShadow: "0 6px 20px var(--homepage-ai-primary)25",
					}}
				/>
			</div>

			{/* Small static dots */}
			{[
				{ top: "15%", left: "10%", id: "dot-top-left" },
				{ top: "80%", right: "8%", id: "dot-bottom-right" },
				{ top: "25%", right: "15%", id: "dot-top-right" },
				{ bottom: "20%", left: "12%", id: "dot-bottom-left" },
			].map((position, i) => (
				<div
					key={position.id}
					className="absolute w-2 h-2 rounded-full opacity-10"
					style={{
						top: position.top,
						left: position.left,
						right: position.right,
						bottom: position.bottom,
						background:
							i % 2 === 0
								? "var(--homepage-primary)"
								: "var(--homepage-ai-primary)",
					}}
				/>
			))}

			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 opacity-5"
				style={{
					backgroundImage:
						"linear-gradient(var(--homepage-primary)20 1px, transparent 1px), linear-gradient(90deg, var(--homepage-primary)20 1px, transparent 1px)",
					backgroundSize: "60px 60px",
				}}
			/>
		</div>
	);
}

// Helper Components
function HeroBadge({
	badgeRef,
}: { badgeRef: React.RefObject<HTMLDivElement | null> }) {
	return (
		<div ref={badgeRef}>
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
				<span className="mr-2">🤖</span>
				Your AI Study Companion
			</Badge>
		</div>
	);
}

function DynamicHeading({
	headingRef,
	typedText,
	currentWordIndex,
}: {
	headingRef: React.RefObject<HTMLDivElement | null>;
	typedText: string;
	currentWordIndex: number;
}) {
	return (
		<div ref={headingRef} className="space-y-4 lg:space-y-6">
			<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
				<span className="block mb-2 sm:mb-4 text-foreground">
					Your Personal
				</span>

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
							className="inline-block w-1 h-12 sm:h-14 lg:h-20 ml-1 sm:ml-2"
							style={{ backgroundColor: "var(--homepage-primary)" }}
							animate={{ opacity: [1, 0, 1] }}
							transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
						/>
					</motion.span>
				</div>
			</h1>
		</div>
	);
}

function HeroDescription({
	descriptionRef,
}: { descriptionRef: React.RefObject<HTMLDivElement | null> }) {
	return (
		<div
			ref={descriptionRef}
			className="text-lg sm:text-xl lg:text-2xl leading-relaxed max-w-3xl mx-auto px-4 sm:px-0"
			style={{ color: "var(--homepage-muted-foreground)" }}
		>
			AI that{" "}
			<span
				className="font-semibold"
				style={{ color: "var(--homepage-primary)" }}
			>
				detects your knowledge gaps
			</span>
			,{" "}
			<span
				className="font-semibold"
				style={{ color: "var(--homepage-primary)" }}
			>
				adapts to your learning style
			</span>
			, and creates{" "}
			<span
				className="font-semibold"
				style={{ color: "var(--homepage-primary)" }}
			>
				personalized study plans
			</span>{" "}
			that{" "}
			<span className="font-bold relative inline-block">
				evolve with your performance
				<motion.div
					className="absolute bottom-0 left-0 right-0 h-0.5"
					style={{ backgroundColor: "var(--homepage-primary)" }}
					initial={{ scaleX: 0 }}
					animate={{ scaleX: 1 }}
					transition={{ duration: 1, delay: 1.5 }}
				/>
			</span>
		</div>
	);
}

function ProcessSteps({
	stepsRef,
}: { stepsRef: React.RefObject<HTMLDivElement | null> }) {
	const steps = [
		{ icon: Upload, label: "Upload" },
		{ icon: Brain, label: "AI Analyzes" },
		{ icon: BookOpen, label: "Content Generated" },
		{ icon: TrendingUp, label: "Progress Tracked" },
		{ icon: GraduationCap, label: "You Master" },
	];

	return (
		<div
			ref={stepsRef}
			className="hidden sm:flex flex-col sm:flex-row gap-6 sm:gap-2 lg:gap-4 items-center justify-center"
		>
			{/* Mobile: Show as vertical list */}
			<div className="flex flex-col gap-4 sm:hidden">
				{steps.map((step, index) => (
					<div key={step.label} className="flex items-center gap-4">
						<div className="flex items-center gap-3 group cursor-pointer hover:scale-105 transition-transform duration-300">
							<div
								className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl transition-all duration-300 flex-shrink-0"
								style={{ backgroundColor: "var(--homepage-primary)" }}
							>
								<step.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
							</div>
							<span className="font-medium text-sm group-hover:text-primary transition-colors duration-300">
								{step.label}
							</span>
						</div>
						{index < 4 && (
							<div className="ml-6">
								<ArrowRight className="w-4 h-4 opacity-60 rotate-90" />
							</div>
						)}
					</div>
				))}
			</div>

			{/* Desktop: Show as horizontal row */}
			<div className="hidden sm:flex flex-row gap-2 lg:gap-4 items-center justify-center flex-wrap">
				{steps.map((step, index) => (
					<div key={step.label} className="flex items-center gap-1 lg:gap-2">
						<div className="flex flex-col items-center gap-2 lg:gap-3 group cursor-pointer hover:scale-105 transition-transform duration-300">
							<div
								className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl transition-all duration-300"
								style={{ backgroundColor: "var(--homepage-primary)" }}
							>
								<step.icon className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform duration-300" />
							</div>
							<span className="font-medium text-xs lg:text-sm text-center group-hover:text-primary transition-colors duration-300">
								{step.label}
							</span>
						</div>
						{index < 4 && (
							<div className="mx-1 lg:mx-2">
								<ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 opacity-60" />
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function HeroCTA({
	ctaRef,
}: { ctaRef: React.RefObject<HTMLDivElement | null> }) {
	return (
		<div ref={ctaRef} className="flex justify-center">
			<motion.div
				whileHover={{ scale: 1.02, y: -2 }}
				whileTap={{ scale: 0.98 }}
				transition={{ type: "spring", stiffness: 400, damping: 17 }}
			>
				<Button
					size="lg"
					className="text-lg sm:text-xl px-8 sm:px-12 py-6 sm:py-8 rounded-2xl shadow-2xl font-semibold relative overflow-hidden group hover:shadow-3xl transition-all duration-500"
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
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					</Link>
				</Button>
			</motion.div>
		</div>
	);
}

function TrustIndicators({
	trustRef,
}: { trustRef: React.RefObject<HTMLDivElement | null> }) {
	return (
		<div ref={trustRef} className="space-y-4 lg:space-y-6">
			<div className="flex items-center justify-center gap-8 text-base flex-wrap">
				{["Free plan", "Privacy-first design", "Works with any course"].map(
					(feature) => (
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
					)
				)}
			</div>
		</div>
	);
}

export function HeroSection() {
	const [typedText, setTypedText] = useState("");
	const [currentWordIndex, setCurrentWordIndex] = useState(0);

	// GSAP refs
	const heroRef = useRef<HTMLElement>(null);
	const shapesRef = useRef<HTMLDivElement>(null);
	const badgeRef = useRef<HTMLDivElement>(null);
	const headingRef = useRef<HTMLDivElement>(null);
	const descriptionRef = useRef<HTMLDivElement>(null);
	const stepsRef = useRef<HTMLDivElement>(null);
	const ctaRef = useRef<HTMLDivElement>(null);
	const trustRef = useRef<HTMLDivElement>(null);

	const dynamicWords = useMemo(
		() => [
			"Adaptive Learning",
			"AI Study Companion",
			"Learning Partner",
			"Success Engine",
		],
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

	// GSAP ScrollTrigger animations
	useEffect(() => {
		if (typeof window === "undefined") return;

		const ctx = gsap.context(() => {
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: heroRef.current,
					start: "top 80%",
					end: "bottom 20%",
					once: true,
				},
			});

			// Set initial states
			gsap.set(
				[
					shapesRef.current,
					badgeRef.current,
					headingRef.current,
					descriptionRef.current,
					stepsRef.current,
					ctaRef.current,
					trustRef.current,
				],
				{
					opacity: 0,
					y: 50,
				}
			);

			// Animate shapes first
			tl.to(shapesRef.current, {
				opacity: 1,
				y: 0,
				duration: 1.2,
				ease: "power2.out",
			});

			// Sequential entrance animations with stagger
			tl.to(
				badgeRef.current,
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: "power2.out",
				},
				"-=0.8"
			)
				.to(
					headingRef.current,
					{
						opacity: 1,
						y: 0,
						duration: 1,
						ease: "power2.out",
					},
					"-=0.4"
				)
				.to(
					descriptionRef.current,
					{
						opacity: 1,
						y: 0,
						duration: 0.8,
						ease: "power2.out",
					},
					"-=0.5"
				)
				.to(
					stepsRef.current,
					{
						opacity: 1,
						y: 0,
						duration: 0.8,
						ease: "back.out(1.7)",
					},
					"-=0.3"
				)
				.to(
					ctaRef.current,
					{
						opacity: 1,
						y: 0,
						duration: 0.8,
						ease: "back.out(1.7)",
						scale: 1.02,
					},
					"-=0.4"
				)
				.to(ctaRef.current, {
					scale: 1,
					duration: 0.3,
					ease: "power2.out",
				})
				.to(
					trustRef.current,
					{
						opacity: 1,
						y: 0,
						duration: 0.6,
						ease: "power2.out",
					},
					"-=0.2"
				);
		}, heroRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={heroRef}
			className="relative overflow-hidden homepage-gradient-bg py-4 lg:py-6 min-h-[calc(100vh-5rem)] flex items-center"
		>
			{/* Animated Background Shapes */}
			<AnimatedShapes shapesRef={shapesRef} />

			<div className="container mx-auto px-4 relative z-10">
				<div className="max-w-4xl mx-auto text-center">
					{/* Main Content */}
					<div className="text-center space-y-8 lg:space-y-10">
						<HeroBadge badgeRef={badgeRef} />
						<DynamicHeading
							headingRef={headingRef}
							typedText={typedText}
							currentWordIndex={currentWordIndex}
						/>
						<HeroDescription descriptionRef={descriptionRef} />
						<ProcessSteps stepsRef={stepsRef} />
						<HeroCTA ctaRef={ctaRef} />
						<TrustIndicators trustRef={trustRef} />
					</div>
				</div>
			</div>
		</section>
	);
}
