import { Badge } from "@/components/ui/badge";
import { 
	GenerationState, 
	getStateColor, 
	getStateLabel,
	type FeatureGenerationStatus 
} from "@/types/generation-state";
import { 
	CheckCircle2, 
	Clock, 
	AlertCircle, 
	Loader2, 
	XCircle, 
	RotateCcw,
	Circle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureStatusBadgeProps {
	status: FeatureGenerationStatus;
	featureName: string;
	showCount?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function FeatureStatusBadge({
	status,
	featureName,
	showCount = false,
	size = "md",
	className,
}: FeatureStatusBadgeProps) {
	const getStateIcon = (state: GenerationState) => {
		const iconProps = {
			className: cn(
				"w-3 h-3",
				size === "sm" && "w-2 h-2",
				size === "lg" && "w-4 h-4"
			),
		};

		switch (state) {
			case GenerationState.NOT_STARTED:
				return <Circle {...iconProps} />;
			case GenerationState.QUEUED:
				return <Clock {...iconProps} />;
			case GenerationState.PROCESSING:
				return <Loader2 {...iconProps} className={cn(iconProps.className, "animate-spin")} />;
			case GenerationState.PARTIAL_SUCCESS:
				return <AlertCircle {...iconProps} />;
			case GenerationState.COMPLETED:
				return <CheckCircle2 {...iconProps} />;
			case GenerationState.FAILED:
				return <XCircle {...iconProps} />;
			case GenerationState.RETRY_SCHEDULED:
				return <RotateCcw {...iconProps} />;
			default:
				return <Circle {...iconProps} />;
		}
	};

	const getVariant = (state: GenerationState) => {
		switch (state) {
			case GenerationState.COMPLETED:
				return "default";
			case GenerationState.PROCESSING:
			case GenerationState.QUEUED:
				return "secondary";
			case GenerationState.FAILED:
				return "destructive";
			case GenerationState.PARTIAL_SUCCESS:
			case GenerationState.RETRY_SCHEDULED:
				return "outline";
			default:
				return "outline";
		}
	};

	const displayText = () => {
		if (status.generated && showCount) {
			return `${getStateLabel(status.state)} (${status.count})`;
		}
		return getStateLabel(status.state);
	};

	return (
		<Badge
			variant={getVariant(status.state)}
			className={cn(
				"flex items-center gap-1",
				getStateColor(status.state),
				size === "sm" && "text-xs px-2 py-0.5",
				size === "lg" && "text-sm px-3 py-1",
				className
			)}
		>
			{getStateIcon(status.state)}
			<span className="capitalize">
				{featureName}: {displayText()}
			</span>
		</Badge>
	);
}

interface CourseWeekFeaturesBadgeProps {
	features: {
		cuecards: FeatureGenerationStatus;
		mcqs: FeatureGenerationStatus;
		openQuestions: FeatureGenerationStatus;
		summaries: FeatureGenerationStatus;
		goldenNotes: FeatureGenerationStatus;
		conceptMaps: FeatureGenerationStatus;
	};
	overallState: GenerationState;
	compact?: boolean;
	className?: string;
}

export function CourseWeekFeaturesBadge({
	features,
	overallState,
	compact = false,
	className,
}: CourseWeekFeaturesBadgeProps) {
	if (compact) {
		// Show overall state only
		const completedCount = Object.values(features).filter(f => f.generated).length;
		const totalCount = Object.keys(features).length;
		
		return (
			<Badge
				variant={overallState === GenerationState.COMPLETED ? "default" : "secondary"}
				className={cn(
					"flex items-center gap-1",
					getStateColor(overallState),
					className
				)}
			>
				{overallState === GenerationState.PROCESSING ? (
					<Loader2 className="w-3 h-3 animate-spin" />
				) : (
					<CheckCircle2 className="w-3 h-3" />
				)}
				<span>{completedCount}/{totalCount} Features</span>
			</Badge>
		);
	}

	// Show individual feature badges
	return (
		<div className={cn("flex flex-wrap gap-1", className)}>
			<FeatureStatusBadge status={features.cuecards} featureName="Cuecards" size="sm" />
			<FeatureStatusBadge status={features.mcqs} featureName="MCQs" size="sm" />
			<FeatureStatusBadge status={features.openQuestions} featureName="Questions" size="sm" />
			<FeatureStatusBadge status={features.summaries} featureName="Summaries" size="sm" />
			<FeatureStatusBadge status={features.goldenNotes} featureName="Notes" size="sm" />
			<FeatureStatusBadge status={features.conceptMaps} featureName="Maps" size="sm" />
		</div>
	);
}