"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award, Brain, Clock, Target, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function HeroResultsDemo() {
	const [currentMetric, setCurrentMetric] = useState(0);
	const [animatedValues, setAnimatedValues] = useState({
		gradeImprovement: 0,
		timeReduction: 0,
		retentionRate: 0,
		confidenceBoost: 0,
	});

	const metrics = [
		{
			icon: TrendingUp,
			title: "Grade Improvement",
			value: 23,
			suffix: "%",
			description: "Average increase in test scores",
			color: "var(--homepage-success)",
			bgGradient: "from-green-500/20 to-emerald-500/20",
		},
		{
			icon: Clock,
			title: "Time Saved",
			value: 40,
			suffix: "%",
			description: "Reduction in study time needed",
			color: "var(--homepage-primary)",
			bgGradient: "from-blue-500/20 to-indigo-500/20",
		},
		{
			icon: Brain,
			title: "Retention Rate",
			value: 85,
			suffix: "%",
			description: "Information retained after 1 week",
			color: "var(--homepage-ai-primary)",
			bgGradient: "from-purple-500/20 to-pink-500/20",
		},
		{
			icon: Target,
			title: "Goal Achievement",
			value: 92,
			suffix: "%",
			description: "Students reach their target grades",
			color: "var(--homepage-accent)",
			bgGradient: "from-orange-500/20 to-yellow-500/20",
		},
	];

	const features = [
		{ icon: Zap, label: "Smart Quizzes", status: "Generated" },
		{ icon: Brain, label: "AI Summaries", status: "Created" },
		{ icon: Target, label: "Study Plan", status: "Optimized" },
		{ icon: Award, label: "Progress Tracking", status: "Active" },
	];

	// Animate metric values
	useEffect(() => {
		const currentValue = metrics[currentMetric].value;
		let progress = 0;
		const increment = currentValue / 60; // Animate over ~1 second

		const interval = setInterval(() => {
			progress += increment;
			if (progress >= currentValue) {
				progress = currentValue;
				clearInterval(interval);
			}

			setAnimatedValues((prev) => ({
				...prev,
				[currentMetric === 0
					? "gradeImprovement"
					: currentMetric === 1
						? "timeReduction"
						: currentMetric === 2
							? "retentionRate"
							: "confidenceBoost"]: Math.round(progress),
			}));
		}, 16);

		return () => clearInterval(interval);
	}, [currentMetric, metrics]);

	// Cycle through metrics
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentMetric((prev) => (prev + 1) % 4); // Fixed to 4 metrics
		}, 3000);

		return () => clearInterval(interval);
	}, []);

	const currentMetricData = metrics[currentMetric];
	const currentValue = Object.values(animatedValues)[currentMetric];

	return (
		<div className="relative w-full max-w-lg">
			{/* Main Results Card */}
			<motion.div
				className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 relative overflow-hidden"
				initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
				animate={{ opacity: 1, scale: 1, rotateY: 0 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			>
				{/* Animated Background Glow */}
				<motion.div
					className={`absolute inset-0 bg-gradient-to-br ${currentMetricData.bgGradient} rounded-2xl`}
					animate={{ opacity: [0.1, 0.3, 0.1] }}
					transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
				/>

				{/* Header */}
				<div className="relative z-10 text-center mb-8">
					<motion.div
						className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full mb-4"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<motion.div
							animate={{ rotate: [0, 360] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
						>
							<Zap className="w-4 h-4" style={{ color: currentMetricData.color }} />
						</motion.div>
						<span className="text-sm font-semibold">Live Results Dashboard</span>
					</motion.div>

					<motion.h3
						className="text-2xl font-bold mb-2"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5 }}
					>
						Your Success Metrics
					</motion.h3>
				</div>

				{/* Main Metric Display */}
				<AnimatePresence mode="wait">
					<motion.div
						key={currentMetric}
						className="text-center mb-8"
						initial={{ opacity: 0, scale: 0.8, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: -20 }}
						transition={{ duration: 0.5 }}
					>
						<motion.div
							className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
							style={{ backgroundColor: `${currentMetricData.color}15` }}
							animate={{ scale: [1, 1.1, 1] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
						>
							<currentMetricData.icon
								className="w-10 h-10"
								style={{ color: currentMetricData.color }}
							/>
						</motion.div>

						<motion.div
							className="text-5xl font-bold mb-2"
							style={{ color: currentMetricData.color }}
						>
							{currentValue}
							{currentMetricData.suffix}
						</motion.div>

						<div className="text-lg font-semibold mb-1">{currentMetricData.title}</div>
						<div className="text-sm text-gray-600">{currentMetricData.description}</div>
					</motion.div>
				</AnimatePresence>

				{/* Progress Indicators */}
				<div className="flex justify-center gap-2 mb-8">
					{metrics.map((_, index) => (
						<motion.div
							key={`metric-indicator-${index}`}
							className="w-2 h-2 rounded-full"
							style={{
								backgroundColor: index === currentMetric ? currentMetricData.color : "#e2e8f0",
							}}
							animate={{
								scale: index === currentMetric ? 1.2 : 1,
							}}
							transition={{ duration: 0.3 }}
						/>
					))}
				</div>

				{/* Feature Status List */}
				<div className="space-y-3">
					{features.map((feature, index) => (
						<motion.div
							key={feature.label}
							className="flex items-center gap-3 p-3 bg-black/5 rounded-lg"
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.8 + index * 0.1 }}
						>
							<motion.div
								className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
								animate={{ scale: [1, 1.1, 1] }}
								transition={{
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
									delay: index * 0.3,
								}}
							>
								<feature.icon className="w-4 h-4 text-green-600" />
							</motion.div>
							<div className="flex-1">
								<div className="font-medium text-sm">{feature.label}</div>
							</div>
							<motion.div
								className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full"
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ delay: 1 + index * 0.1, type: "spring" }}
							>
								{feature.status}
							</motion.div>
						</motion.div>
					))}
				</div>
			</motion.div>

			{/* Floating Success Badges */}
			<div className="absolute inset-0 pointer-events-none">
				{[
					{ icon: "🎯", label: "+23%", position: { top: "10%", right: "-5%" } },
					{ icon: "⚡", label: "40% Faster", position: { bottom: "20%", left: "-8%" } },
					{ icon: "🏆", label: "92% Success", position: { top: "50%", right: "-10%" } },
				].map((badge, index) => (
					<motion.div
						key={`success-badge-${index}`}
						className="absolute bg-white rounded-full px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-semibold"
						style={badge.position}
						initial={{ opacity: 0, scale: 0, rotate: -45 }}
						animate={{
							opacity: 1,
							scale: 1,
							rotate: 0,
							y: [0, -10, 0],
						}}
						transition={{
							delay: 1.5 + index * 0.3,
							duration: 0.5,
							y: {
								duration: 3,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							},
						}}
					>
						<span>{badge.icon}</span>
						<span style={{ color: currentMetricData.color }}>{badge.label}</span>
					</motion.div>
				))}
			</div>
		</div>
	);
}
