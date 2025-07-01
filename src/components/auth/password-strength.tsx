"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
	password: string;
	className?: string;
	showRequirements?: boolean;
}

interface PasswordRequirement {
	label: string;
	test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
	{
		label: "At least 8 characters",
		test: (password) => password.length >= 8,
	},
	{
		label: "Contains uppercase letter",
		test: (password) => /[A-Z]/.test(password),
	},
	{
		label: "Contains lowercase letter",
		test: (password) => /[a-z]/.test(password),
	},
	{
		label: "Contains number",
		test: (password) => /\d/.test(password),
	},
	{
		label: "Contains special character",
		test: (password) => /[^A-Za-z0-9]/.test(password),
	},
];

export function PasswordStrength({
	password,
	className,
	showRequirements = true,
}: PasswordStrengthProps) {
	if (!password) return null;

	const passedRequirements = requirements.filter((req) => req.test(password));
	const strength = (passedRequirements.length / requirements.length) * 100;

	const getStrengthColor = () => {
		if (strength < 25) return "bg-destructive";
		if (strength < 50) return "bg-orange-500";
		if (strength < 75) return "bg-yellow-500";
		return "bg-green-500";
	};

	const getStrengthText = () => {
		if (strength < 25) return "Weak";
		if (strength < 50) return "Fair";
		if (strength < 75) return "Good";
		return "Strong";
	};

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-center space-x-2">
				<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
					<div
						className={cn("h-full transition-all duration-300", getStrengthColor())}
						style={{ width: `${strength}%` }}
					/>
				</div>
				<span className="text-xs font-medium text-muted-foreground">{getStrengthText()}</span>
			</div>

			{showRequirements && (
				<div className="grid grid-cols-2 gap-1 text-xs">
					{requirements.map((requirement) => {
						const passed = requirement.test(password);
						return (
							<div
								key={requirement.label}
								className={cn(
									"flex items-center space-x-1 transition-colors",
									passed ? "text-green-600" : "text-muted-foreground"
								)}
							>
								{passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
								<span>{requirement.label}</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
