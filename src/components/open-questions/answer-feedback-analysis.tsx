"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	AlertCircle,
	Award,
	BookOpen,
	CheckCircle,
	Target,
	TrendingUp,
	XCircle,
} from "lucide-react";

export interface AnswerFeedbackData {
	factualCorrectness: {
		score: number;
		feedback: string;
		strengths: string[];
		improvements: string[];
	};
	logicalStructure: {
		score: number;
		feedback: string;
		strengths: string[];
		improvements: string[];
	};
	depthOfInsight: {
		score: number;
		feedback: string;
		strengths: string[];
		improvements: string[];
	};
	supportingEvidence: {
		score: number;
		feedback: string;
		strengths: string[];
		improvements: string[];
	};
	overallScore: number;
	overallFeedback: string;
}

interface AnswerFeedbackAnalysisProps {
	feedback: AnswerFeedbackData;
}

export function AnswerFeedbackAnalysis({
	feedback,
}: AnswerFeedbackAnalysisProps) {
	const getScoreColor = (score: number) => {
		if (score >= 80) return "text-green-600 dark:text-green-400";
		if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
		return "text-destructive";
	};

	const getScoreIcon = (score: number) => {
		if (score >= 80)
			return (
				<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
			);
		if (score >= 60)
			return (
				<AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
			);
		return <XCircle className="h-4 w-4 text-destructive" />;
	};

	const getScoreBadgeVariant = (score: number) => {
		if (score >= 80) return "default";
		if (score >= 60) return "secondary";
		return "destructive";
	};

	const criteria = [
		{
			name: "Factual Correctness",
			icon: <Target className="h-4 w-4" />,
			data: feedback.factualCorrectness,
			description: "Accuracy of information and facts presented",
		},
		{
			name: "Logical Structure",
			icon: <TrendingUp className="h-4 w-4" />,
			data: feedback.logicalStructure,
			description: "Organization and flow of arguments",
		},
		{
			name: "Depth of Insight",
			icon: <BookOpen className="h-4 w-4" />,
			data: feedback.depthOfInsight,
			description: "Level of analysis and understanding demonstrated",
		},
		{
			name: "Supporting Evidence",
			icon: <Award className="h-4 w-4" />,
			data: feedback.supportingEvidence,
			description: "Quality and relevance of examples and evidence",
		},
	];

	return (
		<div className="space-y-6">
			{/* Overall Score */}
			<div className="p-4 bg-muted/30 rounded-lg border">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">Overall Assessment</h3>
					<Badge
						variant={getScoreBadgeVariant(feedback.overallScore)}
						className="text-sm"
					>
						{feedback.overallScore}%
					</Badge>
				</div>
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						{getScoreIcon(feedback.overallScore)}
						<Progress value={feedback.overallScore} className="flex-1" />
						<span
							className={`text-sm font-medium ${getScoreColor(feedback.overallScore)}`}
						>
							{feedback.overallScore}%
						</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{feedback.overallFeedback}
					</p>
				</div>
			</div>

			{/* Detailed Criteria Analysis */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Detailed Analysis</h3>
				<Accordion type="multiple" className="w-full">
					{criteria.map((criterion) => (
						<AccordionItem value={criterion.name} key={criterion.name}>
							<AccordionTrigger className="hover:no-underline">
								<div className="flex items-center justify-between w-full pr-4">
									<div className="flex items-center gap-2">
										{criterion.icon}
										<h4 className="font-medium">{criterion.name}</h4>
									</div>
									<Badge
										variant={getScoreBadgeVariant(criterion.data.score)}
										className="text-sm"
									>
										{criterion.data.score}%
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="pt-4 space-y-4">
								<p className="text-xs text-muted-foreground">
									{criterion.description}
								</p>

								<div className="flex items-center gap-2">
									{getScoreIcon(criterion.data.score)}
									<Progress value={criterion.data.score} className="flex-1" />
									<span
										className={`text-sm font-medium ${getScoreColor(criterion.data.score)}`}
									>
										{criterion.data.score}%
									</span>
								</div>

								<p className="text-sm">{criterion.data.feedback}</p>

								{criterion.data.strengths.length > 0 && (
									<div className="space-y-1">
										<h5 className="text-sm font-medium text-green-700 dark:text-green-400">
											Strengths:
										</h5>
										<ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
											{criterion.data.strengths.map((strength, i) => (
												<li
													key={`strength-${i}-${strength.slice(0, 10)}`}
													className="flex items-start gap-2"
												>
													<CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
													{strength}
												</li>
											))}
										</ul>
									</div>
								)}

								{criterion.data.improvements.length > 0 && (
									<div className="space-y-1">
										<h5 className="text-sm font-medium text-amber-700 dark:text-amber-400">
											Areas for Improvement:
										</h5>
										<ul className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
											{criterion.data.improvements.map((improvement, i) => (
												<li
													key={`improvement-${i}-${improvement.slice(0, 10)}`}
													className="flex items-start gap-2"
												>
													<AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
													{improvement}
												</li>
											))}
										</ul>
									</div>
								)}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</div>
	);
}
