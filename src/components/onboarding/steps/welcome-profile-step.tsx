"use client";
import { useStepValidation } from "@/components/step-validation-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileStepData } from "@/hooks/use-onboarding";
import { motion } from "framer-motion";
import { User, Users } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

export function WelcomeProfileStep() {
	const { setStepValid, setStepData } = useStepValidation();
	const { firstName, lastName, isLoading, hasValidProfile } =
		useProfileStepData();

	// Derive form data from server state with local input state
	const initialFormData = useMemo(
		() => ({
			firstName: firstName || "",
			lastName: lastName || "",
		}),
		[firstName, lastName]
	);

	const [formData, setFormData] = useState(initialFormData);

	// Sync form data when server state changes
	useMemo(() => {
		if (!isLoading) {
			setFormData(initialFormData);
		}
	}, [initialFormData, isLoading]);

	// Initialize step validation once when component mounts
	const isInitialized = useRef(false);
	useLayoutEffect(() => {
		if (!isInitialized.current && !isLoading) {
			// Set initial validation state
			const isValid = hasValidProfile;
			setStepValid(isValid);

			if (isValid) {
				setStepData({
					firstName: formData.firstName,
					lastName: formData.lastName,
				});
			}
			isInitialized.current = true;
		}
	}, [isLoading, hasValidProfile, formData, setStepValid, setStepData]);

	const handleInputChange = (field: string, value: string) => {
		const newFormData = { ...formData, [field]: value };
		setFormData(newFormData);

		// Update validation state and step data
		const isValid =
			newFormData.firstName.trim() !== "" && newFormData.lastName.trim() !== "";
		setStepValid(isValid);

		if (isValid) {
			setStepData({
				firstName: newFormData.firstName,
				lastName: newFormData.lastName,
			});
		}
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
			className="space-y-16"
		>
			{/* Welcome Header */}
			<motion.div variants={itemVariants} className="text-center space-y-4">
				<div className="space-y-2">
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
		</motion.div>
	);
}
