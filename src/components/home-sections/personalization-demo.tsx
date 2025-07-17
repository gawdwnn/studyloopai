"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Clock, Eye, GraduationCap, Hand, Headphones, Target } from "lucide-react";
import { useState } from "react";

export function PersonalizationDemo() {
	const [learningStyle, setLearningStyle] = useState([50]);
	const [studyPace, setStudyPace] = useState([50]);
	const [difficulty, setDifficulty] = useState([50]);
	const [focus, setFocus] = useState([50]);

	const getLearningStyleLabel = (value: number) => {
		if (value < 33)
			return { label: "Visual Learner", icon: Eye, color: "bg-blue-500/10 text-blue-600" };
		if (value < 66)
			return {
				label: "Auditory Learner",
				icon: Headphones,
				color: "bg-purple-500/10 text-purple-600",
			};
		return { label: "Kinesthetic Learner", icon: Hand, color: "bg-green-500/10 text-green-600" };
	};

	const getPaceLabel = (value: number) => {
		if (value < 33)
			return { label: "Slow & Steady", icon: Clock, color: "bg-orange-500/10 text-orange-600" };
		if (value < 66)
			return { label: "Moderate Pace", icon: BookOpen, color: "bg-yellow-500/10 text-yellow-600" };
		return { label: "Fast & Intensive", icon: Target, color: "bg-red-500/10 text-red-600" };
	};

	const getDifficultyLabel = (value: number) => {
		if (value < 33)
			return { label: "Beginner", icon: GraduationCap, color: "bg-green-500/10 text-green-600" };
		if (value < 66)
			return { label: "Intermediate", icon: BookOpen, color: "bg-yellow-500/10 text-yellow-600" };
		return { label: "Advanced", icon: Target, color: "bg-red-500/10 text-red-600" };
	};

	const getFocusLabel = (value: number) => {
		if (value < 33)
			return { label: "Concepts", icon: BookOpen, color: "bg-blue-500/10 text-blue-600" };
		if (value < 66)
			return { label: "Practice", icon: Target, color: "bg-purple-500/10 text-purple-600" };
		return { label: "Memorization", icon: GraduationCap, color: "bg-green-500/10 text-green-600" };
	};

	const currentLearningStyle = getLearningStyleLabel(learningStyle[0]);
	const currentPace = getPaceLabel(studyPace[0]);
	const currentDifficulty = getDifficultyLabel(difficulty[0]);
	const currentFocus = getFocusLabel(focus[0]);

	const getCurrentIcon = (IconComponent: React.ElementType, color: string) => (
		<motion.div
			initial={{ scale: 0.8, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 20,
				duration: 0.3,
			}}
		>
			<IconComponent className={`w-5 h-5 ${color.split(" ")[1]}`} />
		</motion.div>
	);

	// Spring animations for value changes
	const springTransition = {
		type: "spring" as const,
		stiffness: 300,
		damping: 30,
		mass: 0.8,
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
			{/* Controls */}
			<motion.div
				className="space-y-6"
				initial={{ opacity: 0, x: -30 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
			>
				<div>
					<h3 className="text-xl font-semibold mb-4">Customize Your AI Study Companion</h3>
					<p className="text-sm opacity-75 mb-6">
						Adjust the sliders to see how your AI companion adapts to your learning style
					</p>
				</div>

				{/* Learning Style Slider */}
				<motion.div
					className="space-y-3"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.4 }}
				>
					<div className="flex items-center justify-between">
						<label htmlFor="learning-style" className="text-sm font-medium">
							Learning Style
						</label>
						<motion.div
							key={currentLearningStyle.label}
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={springTransition}
						>
							<Badge variant="secondary" className={currentLearningStyle.color}>
								{getCurrentIcon(currentLearningStyle.icon, currentLearningStyle.color)}
								<span className="ml-2">{currentLearningStyle.label}</span>
							</Badge>
						</motion.div>
					</div>
					<Slider
						id="learning-style"
						value={learningStyle}
						onValueChange={setLearningStyle}
						max={100}
						step={1}
						className="w-full"
					/>
					<div className="flex justify-between text-xs opacity-60">
						<span>Visual</span>
						<span>Auditory</span>
						<span>Kinesthetic</span>
					</div>
				</motion.div>

				{/* Study Pace Slider */}
				<motion.div
					className="space-y-3"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.5 }}
				>
					<div className="flex items-center justify-between">
						<label htmlFor="study-pace" className="text-sm font-medium">
							Study Pace
						</label>
						<motion.div
							key={currentPace.label}
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={springTransition}
						>
							<Badge variant="secondary" className={currentPace.color}>
								{getCurrentIcon(currentPace.icon, currentPace.color)}
								<span className="ml-2">{currentPace.label}</span>
							</Badge>
						</motion.div>
					</div>
					<Slider
						id="study-pace"
						value={studyPace}
						onValueChange={setStudyPace}
						max={100}
						step={1}
						className="w-full"
					/>
					<div className="flex justify-between text-xs opacity-60">
						<span>Slow & Steady</span>
						<span>Moderate</span>
						<span>Fast & Intensive</span>
					</div>
				</motion.div>

				{/* Difficulty Slider */}
				<motion.div
					className="space-y-3"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.6 }}
				>
					<div className="flex items-center justify-between">
						<label htmlFor="difficulty" className="text-sm font-medium">
							Difficulty Level
						</label>
						<motion.div
							key={currentDifficulty.label}
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={springTransition}
						>
							<Badge variant="secondary" className={currentDifficulty.color}>
								{getCurrentIcon(currentDifficulty.icon, currentDifficulty.color)}
								<span className="ml-2">{currentDifficulty.label}</span>
							</Badge>
						</motion.div>
					</div>
					<Slider
						id="difficulty"
						value={difficulty}
						onValueChange={setDifficulty}
						max={100}
						step={1}
						className="w-full"
					/>
					<div className="flex justify-between text-xs opacity-60">
						<span>Beginner</span>
						<span>Intermediate</span>
						<span>Advanced</span>
					</div>
				</motion.div>

				{/* Focus Area Slider */}
				<motion.div
					className="space-y-3"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.7 }}
				>
					<div className="flex items-center justify-between">
						<label htmlFor="focus-area" className="text-sm font-medium">
							Focus Area
						</label>
						<motion.div
							key={currentFocus.label}
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={springTransition}
						>
							<Badge variant="secondary" className={currentFocus.color}>
								{getCurrentIcon(currentFocus.icon, currentFocus.color)}
								<span className="ml-2">{currentFocus.label}</span>
							</Badge>
						</motion.div>
					</div>
					<Slider
						id="focus-area"
						value={focus}
						onValueChange={setFocus}
						max={100}
						step={1}
						className="w-full"
					/>
					<div className="flex justify-between text-xs opacity-60">
						<span>Concepts</span>
						<span>Practice</span>
						<span>Memorization</span>
					</div>
				</motion.div>
			</motion.div>

			{/* Preview */}
			<motion.div
				className="space-y-4"
				initial={{ opacity: 0, x: 30 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6, delay: 0.4 }}
			>
				<motion.div
					whileHover={{
						scale: 1.02,
						boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
					}}
					transition={{ type: "spring", stiffness: 400, damping: 25 }}
				>
					<Card className="transition-all duration-300 hover:shadow-lg">
						<CardHeader>
							<CardTitle className="text-lg">Your Personalized Study Experience</CardTitle>
							<CardDescription>
								See how your AI companion adapts based on your preferences
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Sample Quiz Question */}
							<div className="p-4 bg-muted/50 rounded-lg">
								<h4 className="font-medium mb-2">Sample Quiz Question</h4>
								<AnimatePresence mode="wait">
									{learningStyle[0] < 33 && (
										<motion.div
											key="visual"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -20 }}
											transition={springTransition}
										>
											<div className="text-sm">
												<p className="mb-2">
													Visual learner detected - showing diagram-based question:
												</p>
												<div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
													📊 Which diagram best represents the concept of photosynthesis?
												</div>
											</div>
										</motion.div>
									)}
									{learningStyle[0] >= 33 && learningStyle[0] < 66 && (
										<motion.div
											key="auditory"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -20 }}
											transition={springTransition}
										>
											<div className="text-sm">
												<p className="mb-2">
													Auditory learner detected - providing audio explanation:
												</p>
												<div className="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
													🎵 Listen to the explanation and answer: What is the main process in
													photosynthesis?
												</div>
											</div>
										</motion.div>
									)}
									{learningStyle[0] >= 66 && (
										<motion.div
											key="kinesthetic"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -20 }}
											transition={springTransition}
										>
											<div className="text-sm">
												<p className="mb-2">
													Kinesthetic learner detected - interactive simulation:
												</p>
												<div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
													🔬 Drag and drop the components to build the photosynthesis equation
												</div>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* Study Schedule */}
							<div className="p-4 bg-muted/50 rounded-lg">
								<h4 className="font-medium mb-2">Recommended Study Schedule</h4>
								<div className="text-sm space-y-1">
									<AnimatePresence mode="wait">
										{studyPace[0] < 33 && (
											<motion.div
												key="slow"
												initial={{ opacity: 0, scale: 0.95 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.95 }}
												transition={springTransition}
											>
												<div>
													<p>🐌 Slow & Steady: 30-45 min sessions</p>
													<p className="text-xs opacity-75">Perfect for deep understanding</p>
												</div>
											</motion.div>
										)}
										{studyPace[0] >= 33 && studyPace[0] < 66 && (
											<motion.div
												key="moderate"
												initial={{ opacity: 0, scale: 0.95 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.95 }}
												transition={springTransition}
											>
												<div>
													<p>⚡ Moderate Pace: 45-60 min sessions</p>
													<p className="text-xs opacity-75">Balanced approach with breaks</p>
												</div>
											</motion.div>
										)}
										{studyPace[0] >= 66 && (
											<motion.div
												key="fast"
												initial={{ opacity: 0, scale: 0.95 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.95 }}
												transition={springTransition}
											>
												<div>
													<p>🚀 Fast & Intensive: 60-90 min sessions</p>
													<p className="text-xs opacity-75">
														Rapid progress with focused intensity
													</p>
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>

							{/* Difficulty Adaptation */}
							<div className="p-4 bg-muted/50 rounded-lg">
								<h4 className="font-medium mb-2">Content Difficulty</h4>
								<div className="flex items-center gap-2 text-sm">
									<AnimatePresence mode="wait">
										{difficulty[0] < 33 && (
											<motion.div
												key="beginner"
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: 20 }}
												transition={springTransition}
											>
												<div className="flex items-center gap-2">
													<motion.div
														className="w-8 h-2 bg-green-400 rounded-full"
														initial={{ scaleX: 0 }}
														animate={{ scaleX: 1 }}
														transition={{ duration: 0.6, delay: 0.2 }}
													/>
													<span>Beginner-friendly explanations</span>
												</div>
											</motion.div>
										)}
										{difficulty[0] >= 33 && difficulty[0] < 66 && (
											<motion.div
												key="intermediate"
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: 20 }}
												transition={springTransition}
											>
												<div className="flex items-center gap-2">
													<motion.div
														className="w-8 h-2 bg-yellow-400 rounded-full"
														initial={{ scaleX: 0 }}
														animate={{ scaleX: 1 }}
														transition={{ duration: 0.6, delay: 0.2 }}
													/>
													<span>Intermediate challenges</span>
												</div>
											</motion.div>
										)}
										{difficulty[0] >= 66 && (
											<motion.div
												key="advanced"
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: 20 }}
												transition={springTransition}
											>
												<div className="flex items-center gap-2">
													<motion.div
														className="w-8 h-2 bg-red-400 rounded-full"
														initial={{ scaleX: 0 }}
														animate={{ scaleX: 1 }}
														transition={{ duration: 0.6, delay: 0.2 }}
													/>
													<span>Advanced problem-solving</span>
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>
		</div>
	);
}
