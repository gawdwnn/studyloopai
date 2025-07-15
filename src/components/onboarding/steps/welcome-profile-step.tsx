"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { motion } from "framer-motion";
import { BookOpen, User, Users } from "lucide-react";
import { useState } from "react";

export function WelcomeProfileStep() {
	const { profileData, updateProfileData, markStepCompleted, goToNextStep } = useOnboardingStore();

	const [formData, setFormData] = useState({
		firstName: profileData.firstName || "",
		lastName: profileData.lastName || "",
	});

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleContinue = () => {
		updateProfileData(formData);
		markStepCompleted(1); // Welcome & Profile step
		goToNextStep();
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
			className="space-y-8"
		>
			{/* Welcome Header */}
			<motion.div variants={itemVariants} className="text-center space-y-4">
				<div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
					<BookOpen className="h-10 w-10 text-primary-foreground" />
				</div>
				<div className="space-y-2">
					<h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
						Welcome to StudyLoopAI
					</h2>
					<p className="text-lg text-muted-foreground max-w-md mx-auto">
						Let's start by setting up your profile.
					</p>
				</div>
			</motion.div>

			{/* Form */}
			<motion.div
				variants={itemVariants}
				className="max-w-md mx-auto space-y-4 bg-muted/30 p-8 rounded-lg"
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="firstName">First Name</Label>
						<div className="relative">
							<User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								id="firstName"
								placeholder="John"
								value={formData.firstName}
								onChange={(e) => handleInputChange("firstName", e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="lastName">Last Name</Label>
						<div className="relative">
							<Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								id="lastName"
								placeholder="Doe"
								value={formData.lastName}
								onChange={(e) => handleInputChange("lastName", e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Action button */}
			<motion.div variants={itemVariants} className="flex justify-center pt-4">
				<Button onClick={handleContinue} disabled={!formData.firstName || !formData.lastName}>
					Continue
				</Button>
			</motion.div>
		</motion.div>
	);
}
