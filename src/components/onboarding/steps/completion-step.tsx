"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getOnboardingProgress } from "@/lib/actions/user";
import { motion } from "framer-motion";
import { BookOpen, Brain, CheckCircle, Target } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface OnboardingData {
	firstName?: string;
	lastName?: string;
	studyGoals?: string[];
	selectedPlan?: string;
}

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
			"Try cuecards, quizzes, and summaries tailored to your materials",
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
	const searchParams = useSearchParams();
	const [onboardingData, setOnboardingData] = useState<OnboardingData>({});

	// Load onboarding data on component mount
	useEffect(() => {
		async function loadProgress() {
			const result = await getOnboardingProgress();
			if (result.success) {
				setOnboardingData({
					...result.data,
					firstName: result.data.firstName ?? undefined,
					lastName: result.data.lastName ?? undefined,
				});
			}
		}
		loadProgress();

		// Check if user came from successful payment
		const paymentSuccess = searchParams.get("payment_success");
		const checkoutId = searchParams.get("checkout_id");

		if (paymentSuccess === "true" && checkoutId) {
			toast.success("Payment successful!", {
				description:
					"Your subscription is now active. Welcome to StudyLoop Pro!",
				duration: 5000,
			});
		}
	}, [searchParams]);

	const hasProfile = onboardingData.firstName || onboardingData.lastName;
	const hasGoals =
		onboardingData.studyGoals && onboardingData.studyGoals.length > 0;
	const hasPlan = onboardingData.selectedPlan;

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
									? `${onboardingData.studyGoals?.length} selected`
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
								{hasPlan ? onboardingData.selectedPlan : "Free Plan"}
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

			{/* Helper text */}
			<motion.div variants={itemVariants} className="text-center">
				<p className="text-xs text-muted-foreground">
					You can always revisit these settings in your profile
				</p>
			</motion.div>
		</motion.div>
	);
}
