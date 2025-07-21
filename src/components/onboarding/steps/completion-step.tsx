"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { motion } from "framer-motion";
import {
	ArrowRight,
	BookOpen,
	Brain,
	CheckCircle,
	Sparkles,
	Target,
} from "lucide-react";

const nextSteps = [
	{
		icon: BookOpen,
		title: "Upload your first document",
		description:
			"Add course materials to start generating AI-powered study content",
		color: "text-blue-500",
	},
	{
		icon: Brain,
		title: "Explore AI features",
		description:
			"Try flashcards, quizzes, and summaries tailored to your materials",
		color: "text-purple-500",
	},
	{
		icon: Target,
		title: "Set study goals",
		description:
			"Track your progress and stay motivated with personalized insights",
		color: "text-green-500",
	},
];

export function CompletionStep() {
	const { profileData, planSelection, completeOnboarding } =
		useOnboardingStore();

	const handleGetStarted = () => {
		completeOnboarding();
		// The modal will automatically close when onboarding is completed
	};

	const hasProfile = profileData.firstName || profileData.lastName;
	const hasGoals = profileData.studyGoals && profileData.studyGoals.length > 0;
	const hasPlan = planSelection.selectedPlan;

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { y: 20, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { duration: 0.3 },
		},
	};

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-8"
		>
			{/* Success celebration */}
			<motion.div variants={itemVariants} className="text-center space-y-4">
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center"
				>
					<CheckCircle className="h-10 w-10 text-white" />
				</motion.div>
			</motion.div>

			{/* Setup summary */}
			<motion.div variants={itemVariants} className="space-y-4">
				<h3 className="text-sm font-medium text-center text-muted-foreground">
					Setup Summary
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{/* Profile status */}
					<Card
						className={
							hasProfile ? "border-green-200 bg-green-50" : "border-gray-200"
						}
					>
						<CardContent className="p-3 text-center">
							<div
								className={`text-sm font-medium ${hasProfile ? "text-green-700" : "text-gray-500"}`}
							>
								Profile
							</div>
							<div className="text-xs text-muted-foreground mt-1">
								{hasProfile ? "Completed" : "Skipped"}
							</div>
						</CardContent>
					</Card>

					{/* Goals status */}
					<Card
						className={
							hasGoals ? "border-green-200 bg-green-50" : "border-gray-200"
						}
					>
						<CardContent className="p-3 text-center">
							<div
								className={`text-sm font-medium ${hasGoals ? "text-green-700" : "text-gray-500"}`}
							>
								Study Goals
							</div>
							<div className="text-xs text-muted-foreground mt-1">
								{hasGoals
									? `${profileData.studyGoals?.length} selected`
									: "Skipped"}
							</div>
						</CardContent>
					</Card>

					{/* Plan status */}
					<Card
						className={
							hasPlan ? "border-green-200 bg-green-50" : "border-gray-200"
						}
					>
						<CardContent className="p-3 text-center">
							<div
								className={`text-sm font-medium ${hasPlan ? "text-green-700" : "text-gray-500"}`}
							>
								Plan
							</div>
							<div className="text-xs text-muted-foreground mt-1">
								{hasPlan ? planSelection.selectedPlan : "Free Plan"}
							</div>
						</CardContent>
					</Card>
				</div>
			</motion.div>

			{/* Next steps */}
			<motion.div variants={itemVariants} className="space-y-4">
				<h3 className="text-sm font-medium text-center text-muted-foreground">
					What's Next?
				</h3>

				<div className="grid grid-cols-1 gap-3">
					{nextSteps.map((step) => (
						<motion.div
							key={step.title}
							variants={itemVariants}
							whileHover={{ scale: 1.01 }}
						>
							<Card className="hover:shadow-sm transition-shadow">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className={step.color}>
											<step.icon className="h-5 w-5" />
										</div>
										<div className="flex-1">
											<h4 className="font-medium text-sm">{step.title}</h4>
											<p className="text-xs text-muted-foreground leading-relaxed">
												{step.description}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</div>
			</motion.div>

			{/* Action button */}
			<motion.div variants={itemVariants} className="text-center space-y-4">
				<Button
					onClick={handleGetStarted}
					size="lg"
					className="min-w-[200px] gap-2"
				>
					<Sparkles className="h-4 w-4" />
					Start Learning
					<ArrowRight className="h-4 w-4" />
				</Button>

				<p className="text-xs text-muted-foreground">
					🎉 You can always revisit these settings in your profile
				</p>
			</motion.div>
		</motion.div>
	);
}
