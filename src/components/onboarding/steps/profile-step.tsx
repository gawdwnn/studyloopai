"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ACADEMIC_LEVELS, useOnboardingStore } from "@/lib/stores/onboarding-store";
import { motion } from "framer-motion";
import { GraduationCap, MapPin, User, Users } from "lucide-react";
import { useEffect, useState } from "react";

// Common countries for the dropdown
const countries = [
	"United States",
	"Canada",
	"United Kingdom",
	"Australia",
	"Germany",
	"France",
	"Netherlands",
	"Sweden",
	"India",
	"Singapore",
	"Japan",
	"South Korea",
	"Other",
];

export function ProfileStep() {
	const { profileData, updateProfileData, markStepCompleted } = useOnboardingStore();

	const [formData, setFormData] = useState({
		firstName: profileData.firstName || "",
		lastName: profileData.lastName || "",
		country: profileData.country || "",
		institution: profileData.institution || "",
		academicLevel: profileData.academicLevel || "",
	});

	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		const hasData = !!(formData.firstName || formData.lastName || formData.country);
		setHasChanges(hasData);
	}, [formData]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		updateProfileData({ [field]: value });
	};

	const handleComplete = () => {
		updateProfileData(formData);
		markStepCompleted(2); // Profile step
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
				<div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
					<User className="h-6 w-6 text-white" />
				</div>
				<p className="text-sm text-muted-foreground">
					This helps us personalize your experience and connect you with relevant content
				</p>
			</motion.div>

			{/* Form */}
			<div className="space-y-4">
				{/* Name fields */}
				<motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
				</motion.div>

				{/* Country */}
				<motion.div variants={itemVariants} className="space-y-2">
					<Label htmlFor="country">Country</Label>
					<Select
						value={formData.country}
						onValueChange={(value) => handleInputChange("country", value)}
					>
						<SelectTrigger>
							<div className="flex items-center gap-2">
								<MapPin className="h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder="Select your country" />
							</div>
						</SelectTrigger>
						<SelectContent>
							{countries.map((country) => (
								<SelectItem key={country} value={country}>
									{country}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</motion.div>

				{/* Academic Level */}
				<motion.div variants={itemVariants} className="space-y-2">
					<Label htmlFor="academicLevel">Academic Level</Label>
					<Select
						value={formData.academicLevel}
						onValueChange={(value) => handleInputChange("academicLevel", value)}
					>
						<SelectTrigger>
							<div className="flex items-center gap-2">
								<GraduationCap className="h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder="Select your academic level" />
							</div>
						</SelectTrigger>
						<SelectContent>
							{ACADEMIC_LEVELS.map((level) => (
								<SelectItem key={level.id} value={level.id}>
									{level.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</motion.div>

				{/* Institution (optional) */}
				<motion.div variants={itemVariants} className="space-y-2">
					<Label htmlFor="institution">
						Institution <span className="text-xs text-muted-foreground">(optional)</span>
					</Label>
					<div className="relative">
						<GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							id="institution"
							placeholder="University of Example"
							value={formData.institution}
							onChange={(e) => handleInputChange("institution", e.target.value)}
							className="pl-10"
						/>
					</div>
				</motion.div>
			</div>

			{/* Action buttons */}
			<motion.div variants={itemVariants} className="flex justify-center pt-4">
				{hasChanges && (
					<Button onClick={handleComplete} variant="outline" size="sm">
						Save Profile
					</Button>
				)}
			</motion.div>

			{/* Privacy note */}
			<motion.div variants={itemVariants} className="text-center">
				<p className="text-xs text-muted-foreground">
					🔒 Your information is private and helps us provide better recommendations
				</p>
			</motion.div>
		</motion.div>
	);
}
