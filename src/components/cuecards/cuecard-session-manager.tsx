"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CuecardDisplay } from "./cuecard-display";
import { CuecardResultsView } from "./cuecard-results-view";
import { CuecardSessionSetup } from "./cuecard-session-setup";

interface CuecardData {
  id: string;
  keyword: string;
  definition: string;
  source: string;
}

interface SessionConfig {
  weeks: string[];
  materials: string[];
  cardCount: number;
}

type CuecardFeedback = "too_easy" | "knew_some" | "incorrect";

interface SpacedRepetitionCard extends CuecardData {
  difficulty: number; // 0-10, higher means more difficult
  lastSeen: Date;
  timesCorrect: number;
  timesIncorrect: number;
  easeFactor: number; // SM-2 algorithm ease factor
}

// Static sample data for demonstration
const SAMPLE_CUECARDS: CuecardData[] = [
  {
    id: "1",
    keyword: "LLM (Large Language Model)",
    definition:
      "These advanced neural models are trained on vast amounts of text data to understand context, generate detailed responses, and support nuanced reasoning. They empower systems to dynamically manage and execute complex workflows by selecting appropriate tools and adapting decisions as needed.",
    source: "Week 2 - Practical-guide-to-building-LLMs.pdf",
  },
  {
    id: "2",
    keyword: "Transformer Architecture",
    definition:
      "A neural network architecture that uses self-attention mechanisms to process sequences of data, enabling parallel processing and better handling of long-range dependencies compared to RNNs.",
    source: "Week 2 - Practical-guide-to-building-LLMs.pdf",
  },
  {
    id: "3",
    keyword: "Attention Mechanism",
    definition:
      "A technique that allows neural networks to focus on relevant parts of input data when making predictions, improving performance on tasks requiring understanding of context and relationships.",
    source: "Week 1 - Neural Networks Fundamentals.pdf",
  },
  {
    id: "4",
    keyword: "Fine-tuning",
    definition:
      "The process of adapting a pre-trained model to a specific task by continuing training on task-specific data, allowing the model to specialize while retaining general knowledge.",
    source: "Week 3 - Advanced AI Architectures.pdf",
  },
  {
    id: "5",
    keyword: "Embeddings",
    definition:
      "Dense vector representations of words, phrases, or other data that capture semantic meaning and relationships in a continuous vector space.",
    source: "Week 2 - Practical-guide-to-building-LLMs.pdf",
  },
  {
    id: "6",
    keyword: "Tokenization",
    definition:
      "The process of converting text into smaller units (tokens) that can be processed by machine learning models, such as words, subwords, or characters.",
    source: "Week 1 - Neural Networks Fundamentals.pdf",
  },
  {
    id: "7",
    keyword: "Backpropagation",
    definition:
      "An algorithm used to train neural networks by calculating gradients of the loss function with respect to network weights and propagating them backward through the network.",
    source: "Week 1 - Neural Networks Fundamentals.pdf",
  },
  {
    id: "8",
    keyword: "Gradient Descent",
    definition:
      "An optimization algorithm that iteratively adjusts model parameters in the direction of steepest descent of the loss function to minimize prediction errors.",
    source: "Week 1 - Neural Networks Fundamentals.pdf",
  },
];

interface SessionStats {
  tooEasy: number;
  showAnswer: number;
  incorrect: number;
  startTime: Date;
  endTime?: Date;
}

export function CuecardSessionManager() {
  const [sessionState, setSessionState] = useState<
    "setup" | "active" | "completed"
  >("setup");
  const [sessionCards, setSessionCards] = useState<SpacedRepetitionCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    tooEasy: 0,
    showAnswer: 0,
    incorrect: 0,
    startTime: new Date(),
  });

  // Initialize spaced repetition cards
  const initializeCards = (config: SessionConfig): SpacedRepetitionCard[] => {
    const cards = SAMPLE_CUECARDS.slice(0, config.cardCount).map((card) => ({
      ...card,
      difficulty: 5, // Start with medium difficulty
      lastSeen: new Date(),
      timesCorrect: 0,
      timesIncorrect: 0,
      easeFactor: 2.5, // Default ease factor from SM-2 algorithm
    }));

    // Shuffle cards initially
    return cards.sort(() => Math.random() - 0.5);
  };

  // SM-2 Spaced Repetition Algorithm implementation
  const updateCardDifficulty = (
    card: SpacedRepetitionCard,
    feedback: CuecardFeedback
  ): SpacedRepetitionCard => {
    const updatedCard = { ...card, lastSeen: new Date() };

    switch (feedback) {
      case "too_easy":
        updatedCard.timesCorrect += 1;
        updatedCard.difficulty = Math.max(0, updatedCard.difficulty - 2);
        updatedCard.easeFactor = Math.max(1.3, updatedCard.easeFactor + 0.1);
        break;
      case "knew_some":
        updatedCard.difficulty = Math.min(10, updatedCard.difficulty + 1);
        updatedCard.easeFactor = Math.max(1.3, updatedCard.easeFactor - 0.1);
        break;
      case "incorrect":
        updatedCard.timesIncorrect += 1;
        updatedCard.difficulty = Math.min(10, updatedCard.difficulty + 3);
        updatedCard.easeFactor = Math.max(1.3, updatedCard.easeFactor - 0.2);
        break;
    }

    return updatedCard;
  };

  // Sort cards by difficulty (higher difficulty first) for spaced repetition
  const sortCardsByDifficulty = (
    cards: SpacedRepetitionCard[]
  ): SpacedRepetitionCard[] => {
    return cards.sort((a, b) => {
      // Primary sort: difficulty (higher first)
      if (a.difficulty !== b.difficulty) {
        return b.difficulty - a.difficulty;
      }
      // Secondary sort: times incorrect (higher first)
      return b.timesIncorrect - a.timesIncorrect;
    });
  };

  const handleStartSession = (config: SessionConfig) => {
    setSessionConfig(config);
    const cards = initializeCards(config);
    setSessionCards(cards);
    setCurrentCardIndex(0);
    setSessionState("active");
    setSessionStats({
      tooEasy: 0,
      showAnswer: 0,
      incorrect: 0,
      startTime: new Date(),
    });
    toast.success("Session started!");
  };

  const handleCardFeedback = (feedback: CuecardFeedback) => {
    if (currentCardIndex >= sessionCards.length) return;

    const currentCard = sessionCards[currentCardIndex];
    const updatedCard = updateCardDifficulty(currentCard, feedback);

    // Update session statistics
    setSessionStats((prev) => ({
      ...prev,
      tooEasy: prev.tooEasy + (feedback === "too_easy" ? 1 : 0),
      showAnswer: prev.showAnswer + (feedback === "knew_some" ? 1 : 0),
      incorrect: prev.incorrect + (feedback === "incorrect" ? 1 : 0),
    }));

    // Update the card in the session
    const updatedCards = [...sessionCards];
    updatedCards[currentCardIndex] = updatedCard;

    // Resort cards based on difficulty after feedback
    const sortedCards = sortCardsByDifficulty(updatedCards);
    setSessionCards(sortedCards);

    // Move to next card
    if (currentCardIndex < sessionCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Session completed
      setSessionStats((prev) => ({ ...prev, endTime: new Date() }));
      setSessionState("completed");
      toast.success("Session completed!");
    }
  };

  const handleCloseSession = () => {
    setSessionState("setup");
    setSessionCards([]);
    setCurrentCardIndex(0);
    setSessionConfig(null);
    setSessionStats({
      tooEasy: 0,
      showAnswer: 0,
      incorrect: 0,
      startTime: new Date(),
    });
  };

  const calculateSessionTime = () => {
    if (!sessionStats.endTime) return "0 min";
    const diffMs =
      sessionStats.endTime.getTime() - sessionStats.startTime.getTime();
    const diffMin = Math.round(diffMs / 60000);
    return diffMin < 1 ? "< 1 min" : `${diffMin} min`;
  };

  const calculateAvgPerCard = () => {
    if (!sessionStats.endTime) return "0 sec";
    const diffMs =
      sessionStats.endTime.getTime() - sessionStats.startTime.getTime();
    const totalResponses =
      sessionStats.tooEasy + sessionStats.showAnswer + sessionStats.incorrect;
    if (totalResponses === 0) return "0 sec";
    const avgMs = diffMs / totalResponses;
    const avgSec = Math.round(avgMs / 1000);
    return `${avgSec} sec`;
  };

  const getCurrentWeekInfo = () => {
    if (!sessionCards[currentCardIndex]) return "";
    return sessionCards[currentCardIndex].source;
  };

  if (sessionState === "setup") {
    return (
      <CuecardSessionSetup
        onStartSession={handleStartSession}
        onClose={handleCloseSession}
      />
    );
  }

  if (sessionState === "active" && sessionCards.length > 0) {
    return (
      <CuecardDisplay
        card={sessionCards[currentCardIndex]}
        onFeedback={handleCardFeedback}
        onClose={handleCloseSession}
        currentIndex={currentCardIndex}
        totalCards={sessionCards.length}
        weekInfo={getCurrentWeekInfo()}
      />
    );
  }

  if (sessionState === "completed") {
    const resultsData = {
      totalCards: sessionCards.length,
      tooEasy: sessionStats.tooEasy,
      showAnswer: sessionStats.showAnswer,
      incorrect: sessionStats.incorrect,
      sessionTime: calculateSessionTime(),
      avgPerCard: calculateAvgPerCard(),
      weekInfo: sessionCards[0]?.source || "Various Materials",
    };

    return (
      <CuecardResultsView
        results={resultsData}
        onNewSession={handleCloseSession}
      />
    );
  }

  return null;
}
