"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUploadWizardStore } from "@/stores/upload-wizard-store";
import {
	type FeatureType,
	getDefaultConceptMapsConfig,
	getDefaultCuecardsConfig,
	getDefaultGoldenNotesConfig,
	getDefaultMcqsConfig,
	getDefaultOpenQuestionsConfig,
	getDefaultSummariesConfig,
} from "@/types/generation-types";
import { Info } from "lucide-react";

const FEATURES: Record<
	FeatureType,
	{
		label: string;
		description: string;
		tooltip: string;
	}
> = {
	goldenNotes: {
		label: "Golden Notes",
		description: "Essential points and takeaways",
		tooltip:
			"The most important points extracted from your materials. These are the 'must-know' concepts.",
	},
	summaries: {
		label: "Summaries",
		description: "Concise overviews of key concepts",
		tooltip:
			"AI-generated summaries capture the essence of your materials in digestible chunks.",
	},
	cuecards: {
		label: "Cuecards",
		description: "Interactive flashcards for memorization",
		tooltip:
			"AI generates flashcards with questions on one side and answers on the other. Perfect for quick review and memorization.",
	},
	mcqs: {
		label: "Multiple Choice Questions",
		description: "Test understanding with automated scoring",
		tooltip:
			"Auto-generated MCQs test comprehension with instant feedback. Great for exam preparation.",
	},
	openQuestions: {
		label: "Open Questions",
		description: "Essay-style questions for deep learning",
		tooltip:
			"Thought-provoking questions that require detailed answers. Ideal for developing critical thinking.",
	},
	conceptMaps: {
		label: "Concept Maps",
		description: "Visual connections between ideas",
		tooltip:
			"Interactive diagrams showing relationships between concepts. Perfect for visual learners and understanding complex topics.",
	},
} as const;

export function StepFeatureSelection() {
	const { selectiveConfig, setSelectiveConfig } = useUploadWizardStore();

	const toggleFeature = (feature: FeatureType) => {
		const newSelectedFeatures = {
			...selectiveConfig.selectedFeatures,
			[feature]: !selectiveConfig.selectedFeatures[feature],
		};

		// Update feature configs when toggling
		const newFeatureConfigs = { ...selectiveConfig.featureConfigs };

		if (newSelectedFeatures[feature]) {
			// Add default config when enabling
			if (!newFeatureConfigs[feature]) {
				switch (feature) {
					case "cuecards":
						newFeatureConfigs.cuecards = getDefaultCuecardsConfig();
						break;
					case "mcqs":
						newFeatureConfigs.mcqs = getDefaultMcqsConfig();
						break;
					case "openQuestions":
						newFeatureConfigs.openQuestions = getDefaultOpenQuestionsConfig();
						break;
					case "summaries":
						newFeatureConfigs.summaries = getDefaultSummariesConfig();
						break;
					case "goldenNotes":
						newFeatureConfigs.goldenNotes = getDefaultGoldenNotesConfig();
						break;
					case "conceptMaps":
						newFeatureConfigs.conceptMaps = getDefaultConceptMapsConfig();
						break;
				}
			}
		} else {
			// Remove config when disabling
			delete newFeatureConfigs[feature];
		}

		setSelectiveConfig({
			selectedFeatures: newSelectedFeatures,
			featureConfigs: newFeatureConfigs,
		});
	};

	const selectedCount = Object.values(selectiveConfig.selectedFeatures).filter(
		Boolean
	).length;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Select Features to Generate</CardTitle>
				<CardDescription>
					Choose which AI-powered study materials to generate immediately. You
					can always generate other features later on-demand.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
					<span className="text-sm font-medium">Selected Features</span>
					<Badge variant={selectedCount > 0 ? "default" : "secondary"}>
						{selectedCount} selected
					</Badge>
				</div>

				<div className="grid gap-3">
					{(Object.keys(FEATURES) as FeatureType[]).map((featureKey) => {
						const feature = FEATURES[featureKey];
						const isSelected = selectiveConfig.selectedFeatures[featureKey];

						return (
							<button
								key={featureKey}
								type="button"
								className={`relative flex items-start gap-3 p-4 rounded-lg border transition-colors text-left w-full hover:bg-muted/50 ${
									isSelected ? "border-primary bg-primary/5" : ""
								}`}
								onClick={() => toggleFeature(featureKey)}
								aria-label={`Toggle ${feature.label}`}
							>
								<Checkbox
									checked={isSelected}
									onCheckedChange={() => toggleFeature(featureKey)}
									onClick={(e) => e.stopPropagation()}
									className="mt-0.5"
								/>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<h4 className="font-medium">{feature.label}</h4>
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Info className="h-4 w-4 text-muted-foreground cursor-help" />
												</TooltipTrigger>
												<TooltipContent className="max-w-xs">
													<p>{feature.tooltip}</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
									<p className="text-sm text-muted-foreground mt-0.5">
										{feature.description}
									</p>
								</div>
							</button>
						);
					})}
				</div>

				{selectedCount === 0 && (
					<p className="text-sm text-muted-foreground text-center py-2">
						Please select at least one feature to continue
					</p>
				)}
			</CardContent>
		</Card>
	);
}
