"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, MessageCircle, Sparkles, Target, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const phases = [
	{
		icon: MessageCircle,
		title: "Scanning Content",
		description: "Analyzing your materials with AI precision...",
		typingText: "Found 47 key concepts, 12 formulas, 8 case studies...",
		color: "var(--homepage-primary)",
		bgGradient: "from-blue-500/20 to-purple-500/20",
	},
	{
		icon: Brain,
		title: "Learning Your Style",
		description: "Adapting to your unique learning patterns...",
		typingText:
			"Visual learner detected. Preference for examples. Optimal: 25min sessions.",
		color: "var(--homepage-ai-primary)",
		bgGradient: "from-purple-500/20 to-pink-500/20",
	},
	{
		icon: Target,
		title: "Crafting Your Plan",
		description: "Building personalized study materials...",
		typingText: "Generated 23 quiz questions, 5 summaries, 12 flashcards...",
		color: "var(--homepage-success)",
		bgGradient: "from-green-500/20 to-blue-500/20",
	},
	{
		icon: Zap,
		title: "Ready to Excel!",
		description: "Your personalized AI study companion is ready",
		typingText: "Success rate prediction: 94% • Estimated mastery: 8 days",
		color: "var(--homepage-accent)",
		bgGradient: "from-orange-500/20 to-yellow-500/20",
	},
];

export function AIAssistant() {
	const [currentPhase, setCurrentPhase] = useState(0);
	const [isThinking, setIsThinking] = useState(false);
	const [typedText, setTypedText] = useState("");

	// Typing animation effect
	useEffect(() => {
		const currentText = phases[currentPhase].typingText;
		setTypedText("");
		let index = 0;
		const typeInterval = setInterval(() => {
			if (index < currentText.length) {
				setTypedText(currentText.slice(0, index + 1));
				index++;
			} else {
				clearInterval(typeInterval);
			}
		}, 50);

		return () => clearInterval(typeInterval);
	}, [currentPhase]);

	// Phase progression with thinking animation
	useEffect(() => {
		const interval = setInterval(() => {
			setIsThinking(true);
			setTimeout(() => {
				setCurrentPhase((prev) => (prev + 1) % phases.length);
				setIsThinking(false);
			}, 1200);
		}, 4000);

		return () => clearInterval(interval);
	}, []);

	const currentPhaseData = phases[currentPhase];
	const Icon = currentPhaseData.icon;

	return (
		<motion.div
			className="relative"
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.8, ease: "easeOut" }}
		>
			{/* AI Assistant Avatar */}
			<div className="relative flex items-center justify-center">
				{/* Animated Outer Glow */}
				<motion.div
					className={`absolute w-32 h-32 rounded-full bg-gradient-to-r ${currentPhaseData.bgGradient} blur-xl`}
					animate={{
						scale: isThinking ? [1, 1.2, 1] : [1, 1.1, 1],
						opacity: [0.3, 0.6, 0.3],
					}}
					transition={{
						duration: 2,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
				/>

				{/* AI Assistant Core */}
				<motion.div
					className="relative w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-sm border-2"
					style={{
						backgroundImage: `linear-gradient(135deg, ${currentPhaseData.color}15, transparent)`,
						borderColor: currentPhaseData.color,
					}}
					animate={{
						scale: isThinking ? 1.1 : 1,
						rotate: isThinking ? [0, 5, -5, 0] : 0,
					}}
					transition={{ duration: 0.3, ease: "easeInOut" }}
				>
					{/* Thinking Animation */}
					<AnimatePresence>
						{isThinking && (
							<motion.div
								className="absolute inset-0 flex items-center justify-center"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								<div className="flex space-x-1">
									{[0, 1, 2].map((i) => (
										<motion.div
											key={`thinking-dot-${i}`}
											className="w-2 h-2 rounded-full"
											style={{ backgroundColor: currentPhaseData.color }}
											animate={{
												y: [-4, 4, -4],
												opacity: [0.4, 1, 0.4],
											}}
											transition={{
												duration: 0.6,
												repeat: Number.POSITIVE_INFINITY,
												delay: i * 0.1,
												ease: "easeInOut",
											}}
										/>
									))}
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Phase Icon */}
					<AnimatePresence mode="wait">
						{!isThinking && (
							<motion.div
								key={currentPhase}
								initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
								animate={{ opacity: 1, scale: 1, rotate: 0 }}
								exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
								transition={{ duration: 0.4, ease: "easeOut" }}
							>
								<Icon
									className="w-10 h-10"
									style={{ color: currentPhaseData.color }}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>

				{/* Floating Sparkles */}
				<div className="absolute inset-0 pointer-events-none">
					{[...Array(8)].map((_, i) => (
						<motion.div
							key={`sparkle-${i + 1}`}
							className="absolute"
							style={{
								top: `${30 + Math.sin((i * 45 * Math.PI) / 180) * 35}%`,
								left: `${50 + Math.cos((i * 45 * Math.PI) / 180) * 35}%`,
							}}
							animate={{
								y: [-10, 10, -10],
								x: [-5, 5, -5],
								opacity: [0.3, 0.8, 0.3],
								scale: [0.8, 1.2, 0.8],
							}}
							transition={{
								duration: 3 + i * 0.2,
								repeat: Number.POSITIVE_INFINITY,
								delay: i * 0.3,
								ease: "easeInOut",
							}}
						>
							<Sparkles
								className="w-3 h-3 text-yellow-400"
								style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
							/>
						</motion.div>
					))}
				</div>
			</div>

			{/* Status Display */}
			<motion.div className="mt-8 text-center min-h-[120px]" layout>
				<AnimatePresence mode="wait">
					<motion.div
						key={currentPhase}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
					>
						<h3 className="text-lg font-semibold mb-3">
							{currentPhaseData.title}
						</h3>
						<p className="text-sm opacity-75 mb-4">
							{currentPhaseData.description}
						</p>

						{/* Typing Animation */}
						<div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 font-mono text-xs leading-relaxed min-h-[40px] text-left">
							<motion.span
								key={`typing-${currentPhase}`}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.3 }}
							>
								{typedText}
								<motion.span
									className="inline-block w-2 h-4 bg-current ml-1"
									animate={{ opacity: [1, 0, 1] }}
									transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
								/>
							</motion.span>
						</div>
					</motion.div>
				</AnimatePresence>
			</motion.div>

			{/* Progress Indicators */}
			<motion.div
				className="flex justify-center mt-6 space-x-3"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.5, duration: 0.5 }}
			>
				{phases.map((phase, index) => (
					<motion.div
						key={phase.title}
						className="relative"
						animate={{
							scale: index === currentPhase ? 1.2 : 1,
						}}
						transition={{ duration: 0.3, ease: "easeOut" }}
					>
						<div
							className="w-2 h-2 rounded-full transition-all duration-300"
							style={{
								backgroundColor:
									index === currentPhase ? phase.color : `${phase.color}40`,
								boxShadow:
									index === currentPhase ? `0 0 12px ${phase.color}60` : "none",
							}}
						/>
						{index === currentPhase && (
							<motion.div
								className="absolute inset-0 rounded-full"
								style={{ backgroundColor: phase.color }}
								animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
								transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
							/>
						)}
					</motion.div>
				))}
			</motion.div>
		</motion.div>
	);
}
