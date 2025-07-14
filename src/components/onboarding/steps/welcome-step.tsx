"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Brain, Sparkles, Target, Zap } from "lucide-react";

const features = [
	{
		icon: Brain,
		title: "AI-Powered Learning",
		description: "Get personalized study materials generated from your content",
		color: "text-blue-500",
	},
	{
		icon: Target,
		title: "Adaptive Study Plans",
		description: "Smart algorithms that adapt to your learning pace and style",
		color: "text-green-500",
	},
	{
		icon: Sparkles,
		title: "Interactive Content",
		description: "Transform PDFs into flashcards, quizzes, and study guides",
		color: "text-purple-500",
	},
	{
		icon: Zap,
		title: "Instant Feedback",
		description: "Get immediate insights on your progress and knowledge gaps",
		color: "text-orange-500",
	},
];

export function WelcomeStep() {
	return (
		<div className="text-center space-y-8">
			{/* Hero section */}
			<div className="space-y-4">
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center"
				>
					<BookOpen className="h-10 w-10 text-primary-foreground" />
				</motion.div>

				<motion.div
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="space-y-2"
				>
					<h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
						Transform Your Learning
					</h2>
					<p className="text-lg text-muted-foreground max-w-md mx-auto">
						Join thousands of students who are already accelerating their learning with AI
					</p>
				</motion.div>
			</div>

			{/* Features grid */}
			<motion.div
				initial={{ y: 30, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.3 }}
				className="grid grid-cols-1 md:grid-cols-2 gap-4"
			>
				{features.map((feature, index) => (
					<motion.div
						key={feature.title}
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
					>
						<Card className="p-4 h-full hover:shadow-md transition-shadow">
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className={`${feature.color}`}>
										<feature.icon className="h-5 w-5" />
									</div>
									<h3 className="font-semibold text-sm">{feature.title}</h3>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
						</Card>
					</motion.div>
				))}
			</motion.div>

			{/* Call to action */}
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.7 }}
				className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6"
			>
				<p className="text-sm text-muted-foreground">
					This quick setup will help us personalize your experience.
					<br />
					<span className="font-medium text-foreground">It takes less than 2 minutes</span>, and you
					can skip any step.
				</p>
			</motion.div>
		</div>
	);
}
