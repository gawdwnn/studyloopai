"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { motion } from "framer-motion";
import { Bell, Mail, Monitor, Palette, Timer } from "lucide-react";
import { useEffect, useState } from "react";

export function PreferencesStep() {
	const { preferences, updatePreferences, markStepCompleted } = useOnboardingStore();

	const [formData, setFormData] = useState({
		notifications: preferences.notifications ?? true,
		emailUpdates: preferences.emailUpdates ?? false,
		theme: preferences.theme ?? "system",
		studyReminders: preferences.studyReminders ?? true,
	});

	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		// Check if any preferences have been modified from defaults
		const hasData =
			formData.notifications !== true ||
			formData.emailUpdates !== false ||
			formData.theme !== "system" ||
			formData.studyReminders !== true;
		setHasChanges(hasData);
	}, [formData]);

	const handleToggle = (field: keyof typeof formData, value: boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		updatePreferences({ [field]: value });
	};

	const handleThemeChange = (theme: "light" | "dark" | "system") => {
		setFormData((prev) => ({ ...prev, theme }));
		updatePreferences({ theme });
	};

	const handleComplete = () => {
		updatePreferences(formData);
		markStepCompleted(4); // Preferences step
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
				<div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
					<Palette className="h-6 w-6 text-white" />
				</div>
				<p className="text-sm text-muted-foreground">
					Customize how StudyLoop works for you. You can change these later in settings.
				</p>
			</motion.div>

			{/* Preferences cards */}
			<div className="space-y-4">
				{/* Theme Preference */}
				<motion.div variants={itemVariants}>
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<Monitor className="h-4 w-4 text-primary" />
								Theme Preference
							</CardTitle>
							<CardDescription className="text-sm">
								Choose your preferred color scheme
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Select value={formData.theme} onValueChange={handleThemeChange}>
								<SelectTrigger>
									<SelectValue placeholder="Select theme" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="light">Light</SelectItem>
									<SelectItem value="dark">Dark</SelectItem>
									<SelectItem value="system">System</SelectItem>
								</SelectContent>
							</Select>
						</CardContent>
					</Card>
				</motion.div>

				{/* Notifications */}
				<motion.div variants={itemVariants}>
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<Bell className="h-4 w-4 text-primary" />
								Notifications
							</CardTitle>
							<CardDescription className="text-sm">
								Control when and how you receive notifications
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Push notifications */}
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label htmlFor="notifications" className="text-sm font-medium">
										Push notifications
									</Label>
									<p className="text-xs text-muted-foreground">
										Get notified about study progress and achievements
									</p>
								</div>
								<Switch
									id="notifications"
									checked={formData.notifications}
									onCheckedChange={(checked) => handleToggle("notifications", checked)}
								/>
							</div>

							{/* Email updates */}
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label
										htmlFor="emailUpdates"
										className="text-sm font-medium flex items-center gap-1"
									>
										<Mail className="h-3 w-3" />
										Email updates
									</Label>
									<p className="text-xs text-muted-foreground">
										Weekly progress reports and feature announcements
									</p>
								</div>
								<Switch
									id="emailUpdates"
									checked={formData.emailUpdates}
									onCheckedChange={(checked) => handleToggle("emailUpdates", checked)}
								/>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Study Reminders */}
				<motion.div variants={itemVariants}>
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<Timer className="h-4 w-4 text-primary" />
								Study Reminders
							</CardTitle>
							<CardDescription className="text-sm">
								Stay on track with your learning goals
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label htmlFor="studyReminders" className="text-sm font-medium">
										Daily study reminders
									</Label>
									<p className="text-xs text-muted-foreground">
										Gentle nudges to help you maintain consistent study habits
									</p>
								</div>
								<Switch
									id="studyReminders"
									checked={formData.studyReminders}
									onCheckedChange={(checked) => handleToggle("studyReminders", checked)}
								/>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Action button */}
			{hasChanges && (
				<motion.div variants={itemVariants} className="flex justify-center pt-2">
					<Button onClick={handleComplete} variant="outline" size="sm">
						Save Preferences
					</Button>
				</motion.div>
			)}

			{/* Help text */}
			<motion.div variants={itemVariants} className="text-center">
				<p className="text-xs text-muted-foreground">
					⚙️ You can modify these settings anytime from your account preferences
				</p>
			</motion.div>
		</motion.div>
	);
}
