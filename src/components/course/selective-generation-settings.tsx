"use client";

import { CheckCircle2, Info, Minus, Plus, Zap } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { VALIDATION_RULES } from "@/lib/validation/generation-config";
import type {
	FeatureAvailability,
	SelectiveGenerationConfig,
} from "@/types/generation-types";
import { getDefaultConfigForFeature } from "@/types/generation-types";

interface SelectiveGenerationSettingsProps {
	config: SelectiveGenerationConfig;
	onConfigChange: (config: SelectiveGenerationConfig) => void;
	featuresFilter?: (keyof SelectiveGenerationConfig["selectedFeatures"])[];
	featureAvailability?: FeatureAvailability | null;
	showAvailabilityStatus?: boolean;
}

const DIFFICULTY_OPTIONS = [
	{
		value: "beginner",
		label: "Beginner",
		description: "Basic concepts and simple explanations",
	},
	{
		value: "intermediate",
		label: "Intermediate",
		description: "Moderate complexity with detailed analysis",
	},
	{
		value: "advanced",
		label: "Advanced",
		description: "Complex topics with in-depth exploration",
	},
] as const;

const FOCUS_OPTIONS = [
	{
		value: "conceptual",
		label: "Conceptual",
		description: "Theory and fundamental understanding",
	},
	{
		value: "practical",
		label: "Practical",
		description: "Hands-on applications and examples",
	},
	{
		value: "mixed",
		label: "Mixed",
		description: "Balanced theory and practice",
	},
] as const;

const FEATURE_INFO = {
	goldenNotes: {
		label: "Golden Notes",
		description: "Essential points and important takeaways",
		tooltip:
			"The most critical information distilled from your course materials",
	},
	summaries: {
		label: "Summaries",
		description: "Concise overviews of key concepts",
		tooltip:
			"AI-generated summaries that capture the essence of your materials",
	},
	cuecards: {
		label: "Cuecards",
		description: "Interactive flashcards for memorization and quick review",
		tooltip: "Cuecards with Q&A format for memorization and quick review",
	},
	mcqs: {
		label: "Multiple Choice Questions",
		description: "Test understanding with automated scoring",
		tooltip: "Auto-scored MCQs with explanations for each answer choice",
	},
	openQuestions: {
		label: "Open Questions",
		description: "Practice long-form answers and critical thinking",
		tooltip:
			"Essay-style questions that develop deep understanding and writing skills",
	},
	conceptMaps: {
		label: "Concept Map",
		description: "Visual diagrams showing relationships between concepts",
		tooltip:
			"Interactive mind maps that help visualize connections between ideas and concepts",
	},
};

export function SelectiveGenerationSettings({
	config,
	onConfigChange,
	featuresFilter,
	featureAvailability,
	showAvailabilityStatus = false,
}: SelectiveGenerationSettingsProps) {
	const [activeTab, setActiveTab] = useState("features");

	// Helper to check if a feature is already generated
	const isFeatureGenerated = (
		feature: keyof SelectiveGenerationConfig["selectedFeatures"]
	): boolean => {
		if (!featureAvailability || !showAvailabilityStatus) return false;
		return featureAvailability[feature]?.generated ?? false;
	};

	// Helper to get feature status badge
	const getFeatureBadge = (
		feature: keyof SelectiveGenerationConfig["selectedFeatures"]
	) => {
		if (!showAvailabilityStatus || !featureAvailability) return null;

		const status = featureAvailability[feature];
		if (!status) return null;

		if (status.generated) {
			return (
				<Badge
					variant="outline"
					className="text-green-600 border-green-200 bg-green-50"
				>
					<CheckCircle2 className="h-3 w-3 mr-1" />
					{status.count} available
				</Badge>
			);
		}

		return (
			<Badge
				variant="outline"
				className="text-orange-600 border-orange-200 bg-orange-50"
			>
				<Zap className="h-3 w-3 mr-1" />
				Can generate
			</Badge>
		);
	};

	const updateConfig = (updates: Partial<SelectiveGenerationConfig>) => {
		const mergedConfig = { ...config, ...updates };

		// If featuresFilter is provided, filter the config to only include filtered features
		if (featuresFilter && featuresFilter.length > 0) {
			const filteredConfig: SelectiveGenerationConfig = {
				selectedFeatures: Object.fromEntries(
					featuresFilter
						.filter((feature) => mergedConfig.selectedFeatures[feature])
						.map((feature) => [feature, true])
				) as SelectiveGenerationConfig["selectedFeatures"],
				featureConfigs: Object.fromEntries(
					featuresFilter
						.filter(
							(feature) =>
								mergedConfig.selectedFeatures[feature] &&
								mergedConfig.featureConfigs[feature]
						)
						.map((feature) => [feature, mergedConfig.featureConfigs[feature]])
				) as SelectiveGenerationConfig["featureConfigs"],
			};
			onConfigChange(filteredConfig);
		} else {
			onConfigChange(mergedConfig);
		}
	};

	const toggleFeature = (feature: keyof typeof config.selectedFeatures) => {
		const newSelectedFeatures = {
			...config.selectedFeatures,
			[feature]: !config.selectedFeatures[feature],
		};

		// If enabling a feature, add default config; if disabling, remove its config
		const newFeatureConfigs = { ...config.featureConfigs };
		if (newSelectedFeatures[feature]) {
			// If enabling a feature, add default config
			if (!newFeatureConfigs[feature]) {
				Object.assign(newFeatureConfigs, {
					[feature]: getDefaultConfigForFeature(feature),
				});
			}
		} else {
			delete newFeatureConfigs[feature];
		}

		updateConfig({
			selectedFeatures: newSelectedFeatures,
			featureConfigs: newFeatureConfigs,
		});
	};

	const updateFeatureConfig = (
		feature: string,
		configUpdate: Record<string, unknown>
	) => {
		updateConfig({
			featureConfigs: {
				...config.featureConfigs,
				[feature]: {
					...(config.featureConfigs[
						feature as keyof typeof config.featureConfigs
					] || {}),
					...configUpdate,
				},
			},
		});
	};

	const CounterControl = ({
		label,
		value,
		onChange,
		min = 1,
		max = 50,
		description,
	}: {
		label: string;
		value: number;
		onChange: (value: number) => void;
		min?: number;
		max?: number;
		description?: string;
	}) => (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<Label className="text-sm font-medium">{label}</Label>
					{description && (
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					)}
				</div>
				<Badge variant="secondary" className="text-sm">
					{value}
				</Badge>
			</div>
			<div className="flex items-center space-x-3">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChange(Math.max(min, value - 1))}
					disabled={value <= min}
					className="h-8 w-8 p-0"
				>
					<Minus className="h-3 w-3" />
				</Button>
				<div className="flex-1">
					<Slider
						value={[value]}
						onValueChange={([newValue]) => onChange(newValue)}
						min={min}
						max={max}
						step={1}
						className="w-full"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChange(Math.min(max, value + 1))}
					disabled={value >= max}
					className="h-8 w-8 p-0"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);

	// Filter features based on featuresFilter prop
	const availableFeatures = featuresFilter
		? Object.fromEntries(
				Object.entries(FEATURE_INFO).filter(([key]) =>
					featuresFilter.includes(
						key as keyof SelectiveGenerationConfig["selectedFeatures"]
					)
				)
			)
		: FEATURE_INFO;

	const selectedCount = Object.entries(config.selectedFeatures).filter(
		([key, selected]) => {
			if (!featuresFilter) return selected;
			return (
				selected &&
				featuresFilter.includes(
					key as keyof SelectiveGenerationConfig["selectedFeatures"]
				)
			);
		}
	).length;

	return (
		<TooltipProvider>
			<div className="space-y-6">
				<div>
					<h3 className="text-lg font-semibold mb-2">
						Selective Content Generation
					</h3>
					<p className="text-sm text-muted-foreground">
						{showAvailabilityStatus
							? "Features with green badges are already available. Features with orange badges can be generated now."
							: featuresFilter && featuresFilter.length > 0
								? `Configure settings for ${featuresFilter.join(", ")} generation.`
								: "Choose which content types to generate immediately. You can generate others later on-demand."}
					</p>
				</div>

				{/* Quick Summary */}
				<Card className="bg-muted/30">
					<CardHeader className="pb-3">
						<CardTitle className="text-base flex items-center justify-between">
							<span>Selected Features</span>
							<Badge variant={selectedCount > 0 ? "default" : "secondary"}>
								{selectedCount} selected
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{selectedCount === 0 ? (
							<p className="text-sm text-muted-foreground">
								No features selected. Choose at least one feature to generate.
							</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{Object.entries(config.selectedFeatures).map(
									([feature, selected]) => {
										// Only show if feature is in availableFeatures and selected
										const isAvailable =
											!featuresFilter ||
											featuresFilter.includes(
												feature as keyof SelectiveGenerationConfig["selectedFeatures"]
											);

										if (!selected || !isAvailable) return null;

										const featureKey =
											feature as keyof SelectiveGenerationConfig["selectedFeatures"];
										const isGenerated = isFeatureGenerated(featureKey);
										const featureName =
											FEATURE_INFO[feature as keyof typeof FEATURE_INFO].label;

										return (
											<div key={feature} className="flex items-center gap-1">
												<Badge variant="outline">{featureName}</Badge>
												{showAvailabilityStatus &&
													featureAvailability?.[featureKey] && (
														<Badge
															variant="secondary"
															className={
																isGenerated
																	? "text-green-600 bg-green-50 border-green-200"
																	: "text-orange-600 bg-orange-50 border-orange-200"
															}
														>
															{isGenerated ? "Available" : "Will generate"}
														</Badge>
													)}
											</div>
										);
									}
								)}
							</div>
						)}
					</CardContent>
				</Card>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="features">Feature Selection</TabsTrigger>
						<TabsTrigger value="settings" disabled={selectedCount === 0}>
							Feature Settings {selectedCount > 0 && `(${selectedCount})`}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="features" className="space-y-4">
						<div className="grid gap-4">
							{Object.entries(availableFeatures).map(([feature, info]) => {
								const isSelected =
									config.selectedFeatures[
										feature as keyof typeof config.selectedFeatures
									];

								return (
									<Card
										key={feature}
										className={`transition-colors cursor-pointer ${
											isSelected ? "border-primary" : ""
										}`}
										onClick={() =>
											toggleFeature(
												feature as keyof typeof config.selectedFeatures
											)
										}
									>
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-2 flex-wrap">
														<CardTitle className="text-base">
															{info.label}
														</CardTitle>
														<Tooltip>
															<TooltipTrigger asChild>
																<Info className="h-4 w-4 text-muted-foreground cursor-help" />
															</TooltipTrigger>
															<TooltipContent className="max-w-xs">
																<p>{info.tooltip}</p>
															</TooltipContent>
														</Tooltip>
														{getFeatureBadge(
															feature as keyof typeof config.selectedFeatures
														)}
													</div>
													<CardDescription className="mt-1">
														{info.description}
													</CardDescription>
												</div>
												<Checkbox
													checked={isSelected}
													onCheckedChange={() =>
														toggleFeature(
															feature as keyof typeof config.selectedFeatures
														)
													}
													onClick={(e) => e.stopPropagation()}
												/>
											</div>
										</CardHeader>
										{isSelected &&
											config.featureConfigs[
												feature as keyof typeof config.featureConfigs
											] && (
												<CardContent className="pt-0">
													<div className="flex items-center gap-4 text-sm text-muted-foreground">
														<span>
															{(() => {
																const fc =
																	config.featureConfigs[
																		feature as keyof typeof config.featureConfigs
																	];
																if (!fc) return "";
																if (feature === "summaries" && "count" in fc) {
																	return `${fc.count} summaries`;
																}
																if (feature === "conceptMaps") {
																	return "1 comprehensive map";
																}
																return "count" in fc ? `${fc.count} items` : "";
															})()}
														</span>
														<span>•</span>
														<span className="capitalize">
															{config.featureConfigs[
																feature as keyof typeof config.featureConfigs
															]?.difficulty || ""}
														</span>
														<span>•</span>
														<span className="capitalize">
															{config.featureConfigs[
																feature as keyof typeof config.featureConfigs
															]?.focus || ""}
														</span>
													</div>
												</CardContent>
											)}
									</Card>
								);
							})}
						</div>
					</TabsContent>

					<TabsContent value="settings" className="space-y-6">
						{selectedCount === 0 ? (
							<Card>
								<CardContent className="py-12 text-center">
									<p className="text-muted-foreground">
										Please select at least one feature to configure its
										settings.
									</p>
								</CardContent>
							</Card>
						) : (
							Object.entries(config.selectedFeatures).map(
								([feature, selected]) => {
									const isAvailable =
										!featuresFilter ||
										featuresFilter.includes(
											feature as keyof SelectiveGenerationConfig["selectedFeatures"]
										);
									if (
										!selected ||
										!isAvailable ||
										!config.featureConfigs[
											feature as keyof typeof config.featureConfigs
										]
									)
										return null;

									const featureConfig =
										config.featureConfigs[
											feature as keyof typeof config.featureConfigs
										];
									if (!featureConfig) return null;
									const rules =
										VALIDATION_RULES[feature as keyof typeof VALIDATION_RULES];

									return (
										<Card key={feature}>
											<CardHeader>
												<CardTitle className="text-base">
													{
														FEATURE_INFO[feature as keyof typeof FEATURE_INFO]
															.label
													}
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-6">
												{/* Count/Length Control */}
												{feature !== "conceptMaps" &&
													"count" in featureConfig &&
													"count" in rules && (
														<CounterControl
															label="Number to Generate"
															value={featureConfig.count}
															onChange={(value) =>
																updateFeatureConfig(feature, { count: value })
															}
															min={rules.count.min}
															max={rules.count.max}
															description={`Between ${rules.count.min} and ${rules.count.max}`}
														/>
													)}
												{feature === "summaries" &&
													"length" in featureConfig && (
														<div className="space-y-3">
															<Label>Summary Length</Label>
															<Select
																value={featureConfig.length}
																onValueChange={(value) =>
																	updateFeatureConfig(feature, {
																		length: value,
																	})
																}
															>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="short">Short</SelectItem>
																	<SelectItem value="medium">Medium</SelectItem>
																	<SelectItem value="long">Long</SelectItem>
																</SelectContent>
															</Select>
														</div>
													)}

												{/* Difficulty Level */}
												<div className="space-y-3">
													<Label>Difficulty Level</Label>
													<div className="grid grid-cols-3 gap-2">
														{DIFFICULTY_OPTIONS.map((option) => (
															<Button
																key={option.value}
																variant={
																	featureConfig.difficulty === option.value
																		? "default"
																		: "outline"
																}
																size="sm"
																onClick={() =>
																	updateFeatureConfig(feature, {
																		difficulty: option.value,
																	})
																}
																className="w-full"
															>
																{option.label}
															</Button>
														))}
													</div>
												</div>

												{/* Focus Type */}
												<div className="space-y-3">
													<Label>Content Focus</Label>
													<div className="grid grid-cols-3 gap-2">
														{FOCUS_OPTIONS.map((option) => (
															<Tooltip key={option.value}>
																<TooltipTrigger asChild>
																	<Button
																		variant={
																			featureConfig.focus === option.value
																				? "default"
																				: "outline"
																		}
																		size="sm"
																		onClick={() =>
																			updateFeatureConfig(feature, {
																				focus: option.value,
																			})
																		}
																		className="w-full"
																	>
																		{option.label}
																	</Button>
																</TooltipTrigger>
																<TooltipContent>
																	<p>{option.description}</p>
																</TooltipContent>
															</Tooltip>
														))}
													</div>
												</div>

												{/* Cuecard Mode (only for cuecards) */}
												{feature === "cuecards" && "mode" in featureConfig && (
													<div className="space-y-3">
														<Label>Cuecard Mode</Label>
														<div className="grid grid-cols-3 gap-2">
															{[
																"definition",
																"application",
																"comprehensive",
															].map((mode) => (
																<Button
																	key={mode}
																	variant={
																		featureConfig.mode === mode
																			? "default"
																			: "outline"
																	}
																	size="sm"
																	onClick={() =>
																		updateFeatureConfig(feature, { mode })
																	}
																	className="w-full capitalize"
																>
																	{mode}
																</Button>
															))}
														</div>
													</div>
												)}

												{/* Concept Map Style (only for conceptMaps) */}
												{feature === "conceptMaps" &&
													"style" in featureConfig && (
														<div className="space-y-3">
															<Label>Concept Map Style</Label>
															<div className="grid grid-cols-3 gap-2">
																{["hierarchical", "radial", "network"].map(
																	(style) => (
																		<Button
																			key={style}
																			variant={
																				featureConfig.style === style
																					? "default"
																					: "outline"
																			}
																			size="sm"
																			onClick={() =>
																				updateFeatureConfig(feature, { style })
																			}
																			className="w-full capitalize"
																		>
																			{style}
																		</Button>
																	)
																)}
															</div>
														</div>
													)}
											</CardContent>
										</Card>
									);
								}
							)
						)}
					</TabsContent>
				</Tabs>
			</div>
		</TooltipProvider>
	);
}
