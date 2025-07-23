"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	Brain,
	Clock,
	Sparkles,
	TrendingUp,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function BeforeAfterDemo() {
	const [activeView, setActiveView] = useState<"before" | "after">("before");

	const BeforeView = () => (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75">
			{/* Generic Study Materials */}
			<Card className="border-destructive/30 bg-destructive/5">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertCircle className="w-5 h-5" />
						Generic Study Materials
					</CardTitle>
					<CardDescription className="text-destructive/80">
						One-size-fits-all approach that doesn't adapt to your learning style
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="text-sm font-medium">Study Plan</div>
						<div className="bg-card p-3 rounded border-l-4 border-destructive">
							<div className="text-xs text-muted-foreground mb-1">
								Week 1-4: Same for everyone
							</div>
							<div className="text-sm">📚 Read Chapter 1-5</div>
							<div className="text-sm">📝 Complete exercises 1-20</div>
							<div className="text-sm">🧠 Memorize formulas</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">Quiz Questions</div>
						<div className="bg-card p-3 rounded border-l-4 border-destructive">
							<div className="text-sm mb-2">What is photosynthesis?</div>
							<div className="text-xs space-y-1">
								<div>A) Process of eating</div>
								<div>B) Process of breathing</div>
								<div>C) Process of making food</div>
								<div>D) Process of sleeping</div>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">Progress Tracking</div>
						<div className="bg-card p-3 rounded border-l-4 border-destructive">
							<div className="text-sm">📊 Basic percentage score</div>
							<div className="text-xs text-muted-foreground">
								No insight into weak areas
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Frustrated Student */}
			<Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
						<Clock className="w-5 h-5" />
						Frustrated Learning Experience
					</CardTitle>
					<CardDescription className="text-orange-600 dark:text-orange-400">
						Wasted time, unclear progress, and generic feedback
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-destructive rounded-full" />
							<span>Spending hours on topics already mastered</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-destructive rounded-full" />
							<span>Struggling with difficult concepts alone</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-destructive rounded-full" />
							<span>No clear path to improvement</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-destructive rounded-full" />
							<span>Guessing what to study next</span>
						</div>
					</div>

					<div className="bg-card p-3 rounded">
						<div className="text-sm font-medium mb-2">😤 Student Feeling:</div>
						<div className="text-sm text-muted-foreground">
							"I've been studying for hours but I'm not sure if I'm actually
							learning anything..."
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const AfterView = () => (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			{/* Personalized AI Experience */}
			<Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
						<Brain className="w-5 h-5" />
						AI-Powered Personalization
					</CardTitle>
					<CardDescription className="text-green-600 dark:text-green-400">
						Adaptive learning that evolves with your unique style and progress
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="text-sm font-medium">Personalized Study Plan</div>
						<div className="bg-card p-3 rounded border-l-4 border-green-400 dark:border-green-600">
							<div className="text-xs text-green-600 dark:text-green-400 mb-1">
								Tailored for Visual Learner
							</div>
							<div className="text-sm">
								🎨 Interactive diagrams for Chapter 1
							</div>
							<div className="text-sm">
								📊 Focus on weak areas: Cellular respiration
							</div>
							<div className="text-sm">
								⚡ Quick review of mastered concepts
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">Adaptive Quiz Questions</div>
						<div className="bg-card p-3 rounded border-l-4 border-green-400 dark:border-green-600">
							<div className="text-sm mb-2">Based on your learning style:</div>
							<div className="text-xs space-y-1">
								<div>
									🔬 Interactive: Drag components to build photosynthesis
								</div>
								<div>📊 Visual: Identify the process in this diagram</div>
								<div>🧠 Adaptive: Difficulty adjusts based on performance</div>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">Smart Progress Tracking</div>
						<div className="bg-card p-3 rounded border-l-4 border-green-400 dark:border-green-600">
							<div className="text-sm">
								🎯 Concept mastery: 85% Photosynthesis
							</div>
							<div className="text-sm">
								🔍 Weak areas identified: Light reactions
							</div>
							<div className="text-sm">📈 Improvement suggestions ready</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Confident Student */}
			<Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
						<TrendingUp className="w-5 h-5" />
						Confident Learning Journey
					</CardTitle>
					<CardDescription className="text-blue-600 dark:text-blue-400">
						Clear progress, targeted practice, and continuous improvement
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
							<span>Focusing time on areas that need improvement</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
							<span>Getting explanations that match learning style</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
							<span>Clear path to mastery with measurable progress</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
							<span>AI suggests exactly what to study next</span>
						</div>
					</div>

					<div className="bg-card p-3 rounded">
						<div className="text-sm font-medium mb-2">😊 Student Feeling:</div>
						<div className="text-sm text-muted-foreground">
							"I finally understand how I learn best, and I can see myself
							improving every day!"
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-sm font-medium">AI Insights</div>
						<div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded">
							<div className="text-xs text-blue-600 dark:text-blue-400">
								💡 Your AI companion noticed:
							</div>
							<div className="text-sm">
								"You learn faster with visual examples. Here's a diagram to help
								with today's concept."
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	return (
		<div className="space-y-8">
			{/* Toggle Controls */}
			<div className="flex justify-center">
				<Tabs
					value={activeView}
					onValueChange={(value) => setActiveView(value as "before" | "after")}
					className="w-full max-w-md"
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="before" className="flex items-center gap-2">
							<AlertCircle className="w-4 h-4" />
							Before StudyLoop
						</TabsTrigger>
						<TabsTrigger value="after" className="flex items-center gap-2">
							<Sparkles className="w-4 h-4" />
							With StudyLoop
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Content with Smooth Transitions */}
			<div className="relative min-h-[400px] md:min-h-[600px]">
				<AnimatePresence mode="wait">
					{activeView === "before" ? (
						<motion.div
							key="before"
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -50 }}
							transition={{ duration: 0.5, ease: "easeInOut" }}
							className="relative md:absolute md:inset-0"
						>
							<BeforeView />
						</motion.div>
					) : (
						<motion.div
							key="after"
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -50 }}
							transition={{ duration: 0.5, ease: "easeInOut" }}
							className="relative md:absolute md:inset-0"
						>
							<AfterView />
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Call to Action with Hover Animation */}
			<motion.div
				className="text-center mt-6 md:mt-8"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.8 }}
			>
				<motion.div
					whileHover={{ scale: 1.05, y: -2 }}
					whileTap={{ scale: 0.98 }}
					transition={{ type: "spring", stiffness: 400 }}
				>
					<Button
						size="lg"
						className="bg-gradient-to-r from-[var(--homepage-primary)] to-[var(--homepage-ai-primary)] hover:from-[var(--homepage-primary)]/90 hover:to-[var(--homepage-ai-primary)]/90 text-white shadow-lg hover:shadow-xl hover:shadow-[var(--homepage-primary)]/25 transition-all duration-300 relative overflow-hidden px-8 py-6"
						asChild
					>
						<Link href="/auth/signin">
							<motion.div
								className="absolute inset-0 bg-white/20"
								initial={{ x: "-100%" }}
								whileHover={{ x: "100%" }}
								transition={{ duration: 0.6 }}
							/>
							<span className="relative z-10 flex items-center gap-2">
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
										ease: "linear",
									}}
								>
									<Zap className="w-4 h-4" />
								</motion.div>
								Transform Your Learning Today
							</span>
						</Link>
					</Button>
				</motion.div>
			</motion.div>
		</div>
	);
}
