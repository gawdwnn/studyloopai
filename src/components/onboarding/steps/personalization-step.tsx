"use client";
import { useStepValidation } from "@/components/step-validation-context";
import { Card, CardContent } from "@/components/ui/card";
import { usePersonalizationStepData } from "@/hooks/use-onboarding";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Target } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

const STUDY_GOALS = [
	{ id: "exam_prep", label: "Exam Preparation" },
	{ id: "skill_building", label: "Skill Building" },
	{ id: "career_advancement", label: "Career Advancement" },
	{ id: "academic_research", label: "Academic Research" },
	{ id: "personal_interest", label: "Personal Interest" },
	{ id: "certification", label: "Professional Certification" },
] as const;

export function PersonalizationStep() {
	const { setStepValid, setStepData } = useStepValidation();
	const { studyGoals, isLoading } = usePersonalizationStepData();

	// Initialize selectedGoals from server state, but maintain local state for UI updates
	const initialSelectedGoals = useMemo(() => {
		return isLoading ? [] : studyGoals;
	}, [studyGoals, isLoading]);

	const [selectedGoals, setSelectedGoals] =
		useState<string[]>(initialSelectedGoals);

	// Sync local state when server state changes (on initial load)
	useMemo(() => {
		if (!isLoading) {
			setSelectedGoals(studyGoals);
		}
	}, [studyGoals, isLoading]);

	// Initialize step validation once when component mounts
	const isInitialized = useRef(false);
	useLayoutEffect(() => {
		if (!isInitialized.current && !isLoading) {
			// This step is always valid (can proceed with no goals selected)
			setStepValid(true);
			setStepData({ studyGoals: selectedGoals });
			isInitialized.current = true;
		}
	}, [isLoading, selectedGoals, setStepValid, setStepData]);

	const toggleGoal = (goalId: string) => {
		const newGoals = selectedGoals.includes(goalId)
			? selectedGoals.filter((id) => id !== goalId)
			: [...selectedGoals, goalId];

		// Update local state for immediate UI feedback
		setSelectedGoals(newGoals);
		// Update step data for form submission
		setStepData({ studyGoals: newGoals });
	};

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
			className="space-y-6"
		>
			{/* Header */}
			<motion.div variants={itemVariants} className="text-center space-y-2">
				<div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
					<Target className="h-6 w-6 text-white" />
				</div>
				<h2 className="text-2xl font-bold">What are your study goals?</h2>
				<p className="text-sm text-muted-foreground">
					Select all that apply. We'll customize your content and study
					materials accordingly.
				</p>
			</motion.div>

			{/* Goals grid */}
			<motion.div
				variants={itemVariants}
				className="grid grid-cols-1 md:grid-cols-2 gap-3"
			>
				{STUDY_GOALS.map((goal) => {
					const isSelected = selectedGoals.includes(goal.id);

					return (
						<motion.div
							key={goal.id}
							variants={itemVariants}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<Card
								className={cn(
									"cursor-pointer transition-all duration-200 hover:shadow-md",
									isSelected
										? "ring-2 ring-primary shadow-md bg-primary/5"
										: "hover:bg-muted/50"
								)}
								onClick={() => toggleGoal(goal.id)}
							>
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="flex-1">
											<h3 className="font-medium text-sm">{goal.label}</h3>
										</div>
										{isSelected && (
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"
											>
												<Check className="h-3 w-3 text-primary-foreground" />
											</motion.div>
										)}
									</div>
								</CardContent>
							</Card>
						</motion.div>
					);
				})}
			</motion.div>

			{/* Help text */}
			<motion.div variants={itemVariants} className="text-center">
				<p className="text-xs text-muted-foreground">
					You can always update your goals later in your profile settings
				</p>
			</motion.div>
		</motion.div>
	);
}
