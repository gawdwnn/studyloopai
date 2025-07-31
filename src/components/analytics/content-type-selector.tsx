"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { QuestionMarkIcon } from "@radix-ui/react-icons";
import { BookOpen, CheckCircle } from "lucide-react";
import type { ContentType } from "./chart-layout";

interface ContentTypeSelectorInlineProps {
	value: ContentType;
	onChange: (value: ContentType) => void;
	className?: string;
	disabled?: boolean;
	showLabel?: boolean;
}

const CONTENT_TYPE_OPTIONS = [
	{
		value: "cuecard" as const,
		label: "Cuecards",
		description: "Flashcard-based learning",
		icon: BookOpen,
		color: "text-blue-500",
		bgColor: "bg-blue-50 dark:bg-blue-950/20",
		borderColor: "border-blue-200 dark:border-blue-800",
	},
	{
		value: "mcq" as const,
		label: "Multiple Choice",
		description: "MCQ question practice",
		icon: CheckCircle,
		color: "text-emerald-500",
		bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
		borderColor: "border-emerald-200 dark:border-emerald-800",
	},
	{
		value: "open_question" as const,
		label: "Open Questions",
		description: "Essay & discussion questions",
		icon: QuestionMarkIcon,
		color: "text-violet-500",
		bgColor: "bg-violet-50 dark:bg-violet-950/20",
		borderColor: "border-violet-200 dark:border-violet-800",
	},
];

export function ContentTypeSelectorInline({
	value,
	onChange,
	className,
	disabled = false,
	showLabel = true,
}: ContentTypeSelectorInlineProps) {
	return (
		<div className={cn("flex items-center gap-4", className)}>
			{showLabel && (
				<span className="text-sm font-medium text-muted-foreground">
					View as:
				</span>
			)}
			<RadioGroup
				value={value}
				onValueChange={(val) => onChange(val as ContentType)}
				disabled={disabled}
				className="flex items-center gap-2"
			>
				{CONTENT_TYPE_OPTIONS.map((option) => {
					const Icon = option.icon;
					const isSelected = value === option.value;

					return (
						<div key={option.value}>
							<RadioGroupItem
								value={option.value}
								id={`inline-${option.value}`}
								className="sr-only"
							/>
							<Label
								htmlFor={`inline-${option.value}`}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-all",
									"hover:border-primary/50 hover:bg-accent/50",
									isSelected && option.borderColor,
									isSelected && option.bgColor,
									!isSelected && "border-muted-foreground/20",
									disabled && "opacity-50 cursor-not-allowed"
								)}
							>
								<Icon className={cn("h-4 w-4", option.color)} />
								<span className="text-sm font-medium">{option.label}</span>
							</Label>
						</div>
					);
				})}
			</RadioGroup>
		</div>
	);
}
