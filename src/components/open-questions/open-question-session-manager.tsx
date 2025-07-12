"use client";

import { useState } from "react";
import { toast } from "sonner";
import { OpenQuestionQuizView } from "./open-question-quiz-view";
import { OpenQuestionResultsView } from "./open-question-results-view";
import { OpenQuestionSessionSetup } from "./open-question-session-setup";

interface OpenQuestion {
	id: string;
	question: string;
	sampleAnswer: string;
	difficulty: "easy" | "medium" | "hard";
	source: string;
	week: string;
}

interface SessionConfig {
	weeks: string[];
	materials: string[];
	difficulty: string;
	numQuestions: number;
	focus: string;
	practiceMode: "practice" | "exam";
}

interface SessionStats {
	answeredQuestions: number;
	skippedQuestions: number;
	totalTime: number;
	startTime: Date;
	endTime?: Date;
	questionTimes: number[];
	userAnswers: Array<{
		questionId: string;
		userAnswer: string | null;
		timeSpent: number;
	}>;
}

// Enhanced sample data with more questions and metadata
const SAMPLE_QUESTIONS: OpenQuestion[] = [
	{
		id: "1",
		question:
			"Explain why predictability is emphasized as important for agents and provide an example of how unpredictable agent behavior could cause problems.",
		sampleAnswer:
			"Predictability in agent systems ensures that outputs are consistent and reliable, which is crucial for building trust and maintaining system stability. For example, if an agent responsible for financial transactions behaves unpredictably, it could make unauthorized trades or miscalculate amounts, leading to significant financial losses and legal complications.",
		difficulty: "medium",
		source: "Practical guide to building agents.pdf",
		week: "Week 2",
	},
	{
		id: "2",
		question:
			"What new category of systems has been unlocked by advances in reasoning, multimodality, and tool use in large language models? Describe the key characteristics that define this category.",
		sampleAnswer:
			"Agents have been unlocked by these advances. These systems are characterized by their ability to reason about problems, process multiple types of input (text, images, audio), and interact with external tools and environments. Unlike traditional AI systems that simply respond to queries, agents can plan, execute multi-step tasks, and adapt their behavior based on feedback from their environment.",
		difficulty: "easy",
		source: "Practical guide to building agents.pdf",
		week: "Week 2",
	},
	{
		id: "3",
		question:
			"Compare and contrast the transformer architecture with RNNs, focusing on their primary advantages and disadvantages.",
		sampleAnswer:
			"Transformers offer parallel processing capabilities, allowing them to process entire sequences simultaneously rather than sequentially like RNNs. This makes training much faster and more efficient. However, transformers have higher memory requirements and computational complexity for very long sequences. RNNs are more memory-efficient for sequential processing but suffer from vanishing gradients and slower training due to their sequential nature.",
		difficulty: "medium",
		source: "Neural Networks Fundamentals.pdf",
		week: "Week 1",
	},
	{
		id: "4",
		question:
			"In design thinking, what is the purpose of the empathy phase and how does it influence the subsequent phases?",
		sampleAnswer:
			"The empathy phase focuses on understanding users' experiences, emotions, and motivations to inform the design process. It involves observing, interviewing, and immersing yourself in the user's environment to gain deep insights into their needs and pain points. This understanding directly influences the Define phase by helping identify the right problems to solve, the Ideate phase by ensuring solutions address real user needs, and the Prototype and Test phases by providing criteria for evaluation.",
		difficulty: "easy",
		source: "Using design thinking to solve everyday problem.pdf",
		week: "Week 3",
	},
	{
		id: "5",
		question:
			"Explain the concept of fine-tuning in machine learning and discuss when it would be preferable to training a model from scratch.",
		sampleAnswer:
			"Fine-tuning involves taking a pre-trained model and continuing training on task-specific data to specialize it for a particular application. It's preferable to training from scratch when you have limited data, computational resources, or time, as the pre-trained model already contains learned representations that can be adapted. Fine-tuning is particularly effective when the new task is related to the original training domain, allowing the model to leverage existing knowledge while adapting to new requirements.",
		difficulty: "medium",
		source: "Advanced AI Architectures.pdf",
		week: "Week 4",
	},
];

export function OpenQuestionSessionManager() {
	const [sessionState, setSessionState] = useState<"setup" | "active" | "completed">("setup");
	const [sessionQuestions, setSessionQuestions] = useState<OpenQuestion[]>([]);
	const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
	const [sessionStats, setSessionStats] = useState<SessionStats>({
		answeredQuestions: 0,
		skippedQuestions: 0,
		totalTime: 0,
		startTime: new Date(),
		questionTimes: [],
		userAnswers: [],
	});

	// Initialize questions based on session configuration
	const initializeQuestions = (config: SessionConfig): OpenQuestion[] => {
		let filteredQuestions = [...SAMPLE_QUESTIONS];

		// Filter by weeks if specific weeks selected
		if (config.weeks.length > 0 && !config.weeks.includes("all-weeks")) {
			filteredQuestions = filteredQuestions.filter((q) =>
				config.weeks.some((week) => q.week.toLowerCase().includes(week.toLowerCase()))
			);
		}

		// Filter by materials if specific materials selected
		if (config.materials.length > 0 && !config.materials.includes("all-pdfs")) {
			filteredQuestions = filteredQuestions.filter((q) =>
				config.materials.some((material) => q.source.toLowerCase().includes(material.toLowerCase()))
			);
		}

		// Filter by difficulty if not mixed
		if (config.difficulty && config.difficulty !== "mixed") {
			filteredQuestions = filteredQuestions.filter((q) => q.difficulty === config.difficulty);
		}

		// Apply focus strategy
		if (config.focus === "weak-areas") {
			// Prioritize harder questions
			filteredQuestions.sort((a, b) => {
				const difficultyOrder = { hard: 3, medium: 2, easy: 1 };
				return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
			});
		} else if (config.focus === "recent-content") {
			// Prioritize later weeks
			filteredQuestions.sort((a, b) => b.week.localeCompare(a.week));
		} else {
			// Default: shuffle for variety
			filteredQuestions.sort(() => Math.random() - 0.5);
		}

		// Limit to requested number of questions
		return filteredQuestions.slice(0, config.numQuestions);
	};

	const handleStartSession = (config: SessionConfig) => {
		setSessionConfig(config);
		const questions = initializeQuestions(config);
		setSessionQuestions(questions);
		setSessionState("active");
		setSessionStats({
			answeredQuestions: 0,
			skippedQuestions: 0,
			totalTime: 0,
			startTime: new Date(),
			questionTimes: [],
			userAnswers: [],
		});
		toast.success("Open-ended question session started!");
	};

	const handleQuestionAnswer = (
		questionId: string,
		userAnswer: string | null,
		timeSpent: number
	) => {
		setSessionStats((prev) => ({
			...prev,
			answeredQuestions: prev.answeredQuestions + (userAnswer ? 1 : 0),
			skippedQuestions: prev.skippedQuestions + (userAnswer ? 0 : 1),
			questionTimes: [...prev.questionTimes, timeSpent],
			userAnswers: [
				...prev.userAnswers,
				{
					questionId,
					userAnswer,
					timeSpent,
				},
			],
		}));
	};

	const handleEndSession = (totalTime: number) => {
		setSessionStats((prev) => ({
			...prev,
			totalTime,
			endTime: new Date(),
		}));
		setSessionState("completed");
		toast.success("Open-ended question session completed!");
	};

	const handleCloseSession = () => {
		setSessionState("setup");
		setSessionQuestions([]);
		setSessionConfig(null);
		setSessionStats({
			answeredQuestions: 0,
			skippedQuestions: 0,
			totalTime: 0,
			startTime: new Date(),
			questionTimes: [],
			userAnswers: [],
		});
	};

	const calculateSessionTime = () => {
		if (!sessionStats.endTime) return "0 min";
		const diffMs = sessionStats.endTime.getTime() - sessionStats.startTime.getTime();
		const diffMin = Math.round(diffMs / 60000);
		return diffMin < 1 ? "< 1 min" : `${diffMin} min`;
	};

	const calculateAvgPerQuestion = () => {
		if (sessionStats.questionTimes.length === 0) return "0 sec";
		const avgMs =
			sessionStats.questionTimes.reduce((sum, time) => sum + time, 0) /
			sessionStats.questionTimes.length;
		const avgSec = Math.round(avgMs / 1000);
		return `${avgSec} sec`;
	};

	if (sessionState === "setup") {
		return (
			<OpenQuestionSessionSetup onStartSession={handleStartSession} onClose={handleCloseSession} />
		);
	}

	if (sessionState === "active" && sessionQuestions.length > 0 && sessionConfig) {
		return (
			<OpenQuestionQuizView
				questions={sessionQuestions}
				config={sessionConfig}
				onQuestionAnswer={handleQuestionAnswer}
				onEndSession={handleEndSession}
				onClose={handleCloseSession}
			/>
		);
	}

	if (sessionState === "completed") {
		const resultsData = {
			answered: sessionStats.answeredQuestions,
			skipped: sessionStats.skippedQuestions,
			totalTime: calculateSessionTime(),
			timeOnExercise: calculateAvgPerQuestion(),
			avgPerExercise: calculateAvgPerQuestion(),
			questions: sessionQuestions.map((q, index) => {
				const userAnswer = sessionStats.userAnswers[index];
				return {
					question: q.question,
					time: userAnswer ? `${Math.round(userAnswer.timeSpent / 1000)}s` : "0s",
					userAnswer: userAnswer ? userAnswer.userAnswer : null,
					sampleAnswer: q.sampleAnswer,
				};
			}),
		};

		return <OpenQuestionResultsView results={resultsData} onRestart={handleCloseSession} />;
	}

	return null;
}
