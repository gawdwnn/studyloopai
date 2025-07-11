"use client";

import { useState } from "react";
import { toast } from "sonner";
import { McqQuizView } from "./mcq-quiz-view";
import { McqResultsView } from "./mcq-results-view";
import { McqSessionSetup } from "./mcq-session-setup";

interface McqQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
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
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  totalTime: number;
  startTime: Date;
  endTime?: Date;
  questionTimes: number[];
  userAnswers: Array<{
    questionId: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

// Enhanced sample data with more questions and metadata
const SAMPLE_QUESTIONS: McqQuestion[] = [
  {
    id: "1",
    question: "Why is predictability emphasised as important for agents?",
    options: [
      "It helps ensure reliable system behavior",
      "It guarantees the agent can generate random outputs for entertainment purposes",
      "It allows the agent to operate without guidelines or constraints",
      "It eliminates the need for user feedback",
    ],
    correctAnswer: "It helps ensure reliable system behavior",
    explanation: "Predictability in agent systems ensures that outputs are consistent and reliable, which is crucial for building trust and maintaining system stability.",
    difficulty: "medium",
    source: "Practical guide to building agents.pdf",
    week: "Week 2",
  },
  {
    id: "2",
    question: "What new category of systems has been unlocked by advances in reasoning, multimodality, and tool use in large language models?",
    options: [
      "Classical expert systems",
      "Agents",
      "Rule-based automation engines for workflow optimization",
      "Cloud-based multitasking platforms for distributed computation",
    ],
    correctAnswer: "Agents",
    explanation: "The combination of reasoning, multimodality, and tool use capabilities in LLMs has enabled the development of autonomous agents that can interact with their environment.",
    difficulty: "easy",
    source: "Practical guide to building agents.pdf", 
    week: "Week 2",
  },
  {
    id: "3",
    question: "What is the primary advantage of transformer architecture over RNNs?",
    options: [
      "Lower computational complexity",
      "Parallel processing capabilities",
      "Smaller model size",
      "Better memory efficiency",
    ],
    correctAnswer: "Parallel processing capabilities",
    explanation: "Transformers can process sequences in parallel rather than sequentially, making training much faster and more efficient than RNNs.",
    difficulty: "medium",
    source: "Neural Networks Fundamentals.pdf",
    week: "Week 1",
  },
  {
    id: "4",
    question: "In design thinking, what is the purpose of the empathy phase?",
    options: [
      "To generate as many ideas as possible",
      "To understand user needs and pain points",
      "To test prototypes with users",
      "To define the problem statement",
    ],
    correctAnswer: "To understand user needs and pain points",
    explanation: "The empathy phase focuses on understanding users' experiences, emotions, and motivations to inform the design process.",
    difficulty: "easy",
    source: "Using design thinking to solve everyday problem.pdf",
    week: "Week 3",
  },
  {
    id: "5",
    question: "What is fine-tuning in the context of machine learning models?",
    options: [
      "Training a model from scratch",
      "Adjusting hyperparameters during training",
      "Adapting a pre-trained model to a specific task",
      "Reducing model size for deployment",
    ],
    correctAnswer: "Adapting a pre-trained model to a specific task",
    explanation: "Fine-tuning involves taking a pre-trained model and continuing training on task-specific data to specialize it for a particular application.",
    difficulty: "medium",
    source: "Advanced AI Architectures.pdf",
    week: "Week 4",
  },
];

export function McqSessionManager() {
  const [sessionState, setSessionState] = useState<"setup" | "active" | "completed">("setup");
  const [sessionQuestions, setSessionQuestions] = useState<McqQuestion[]>([]);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correctAnswers: 0,
    incorrectAnswers: 0,
    skippedQuestions: 0,
    totalTime: 0,
    startTime: new Date(),
    questionTimes: [],
    userAnswers: [],
  });

  // Initialize questions based on session configuration
  const initializeQuestions = (config: SessionConfig): McqQuestion[] => {
    let filteredQuestions = [...SAMPLE_QUESTIONS];

    // Filter by weeks if specific weeks selected
    if (config.weeks.length > 0 && !config.weeks.includes("all-weeks")) {
      filteredQuestions = filteredQuestions.filter(q => 
        config.weeks.some(week => q.week.toLowerCase().includes(week.toLowerCase()))
      );
    }

    // Filter by materials if specific materials selected
    if (config.materials.length > 0 && !config.materials.includes("all-pdfs")) {
      filteredQuestions = filteredQuestions.filter(q =>
        config.materials.some(material => q.source.toLowerCase().includes(material.toLowerCase()))
      );
    }

    // Filter by difficulty if not mixed
    if (config.difficulty && config.difficulty !== "mixed") {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === config.difficulty);
    }

    // Apply focus strategy
    if (config.focus === "weak-areas") {
      // Prioritize harder questions
      filteredQuestions.sort((a, b) => {
        const difficultyOrder = { "hard": 3, "medium": 2, "easy": 1 };
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
      correctAnswers: 0,
      incorrectAnswers: 0,
      skippedQuestions: 0,
      totalTime: 0,
      startTime: new Date(),
      questionTimes: [],
      userAnswers: [],
    });
    toast.success("MCQ session started!");
  };

  const handleQuestionAnswer = (
    questionId: string,
    selectedAnswer: string | null,
    isCorrect: boolean,
    timeSpent: number
  ) => {
    setSessionStats(prev => ({
      ...prev,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
      skippedQuestions: prev.skippedQuestions + (selectedAnswer === null ? 1 : 0),
      questionTimes: [...prev.questionTimes, timeSpent],
      userAnswers: [...prev.userAnswers, {
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpent,
      }],
    }));
  };

  const handleEndSession = (totalTime: number) => {
    setSessionStats(prev => ({
      ...prev,
      totalTime,
      endTime: new Date(),
    }));
    setSessionState("completed");
    toast.success("MCQ session completed!");
  };

  const handleCloseSession = () => {
    setSessionState("setup");
    setSessionQuestions([]);
    setSessionConfig(null);
    setSessionStats({
      correctAnswers: 0,
      incorrectAnswers: 0,
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
    const avgMs = sessionStats.questionTimes.reduce((sum, time) => sum + time, 0) / sessionStats.questionTimes.length;
    const avgSec = Math.round(avgMs / 1000);
    return `${avgSec} sec`;
  };

  if (sessionState === "setup") {
    return (
      <McqSessionSetup
        onStartSession={handleStartSession}
        onClose={handleCloseSession}
      />
    );
  }

  if (sessionState === "active" && sessionQuestions.length > 0 && sessionConfig) {
    return (
      <McqQuizView
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
      score: sessionStats.userAnswers.length > 0 
        ? Math.round((sessionStats.correctAnswers / sessionStats.userAnswers.length) * 100)
        : 0,
      skipped: sessionStats.skippedQuestions,
      totalTime: calculateSessionTime(),
      timeOnExercise: calculateAvgPerQuestion(),
      avgPerExercise: calculateAvgPerQuestion(),
      questions: sessionQuestions.map((q, index) => {
        const userAnswer = sessionStats.userAnswers[index];
        return {
          question: q.question,
          time: userAnswer ? `${Math.round(userAnswer.timeSpent / 1000)}s` : "0s",
          correct: userAnswer ? userAnswer.isCorrect : false,
          userAnswer: userAnswer ? userAnswer.selectedAnswer : null,
          correctAnswer: q.correctAnswer,
          options: q.options,
          explanation: q.explanation,
        };
      }),
    };

    return (
      <McqResultsView
        results={resultsData}
        onRestart={handleCloseSession}
      />
    );
  }

  return null;
}