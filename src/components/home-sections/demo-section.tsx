"use client";

import { ScrollRevealStagger } from "@/components/scroll-reveal";
import { motion } from "framer-motion";
import { HeroResultsDemo } from "./hero-results-demo";

export function DemoSection() {
	return (
		<section className="relative py-20 lg:py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
			{/* Subtle Background Pattern */}
			<div className="absolute inset-0 opacity-5">
				<div className="absolute top-1/4 left-1/4 w-32 h-32 border border-current rounded-full" />
				<div className="absolute bottom-1/3 right-1/4 w-24 h-24 border border-current rotate-45" />
				<div className="absolute top-2/3 left-2/3 w-16 h-16 border border-current rounded-full" />
			</div>

			<div className="container mx-auto px-4 relative z-10">
				<ScrollRevealStagger staggerDelay={0.2}>
					{/* Section Header */}
					<motion.div className="text-center mb-16 max-w-3xl mx-auto">
						<motion.h2 className="text-4xl lg:text-5xl font-bold mb-6">
							See Your{" "}
							<span 
								className="bg-gradient-to-r bg-clip-text text-transparent"
								style={{
									background: "linear-gradient(135deg, var(--homepage-primary), var(--homepage-ai-primary))",
									WebkitBackgroundClip: "text",
									WebkitTextFillColor: "transparent",
								}}
							>
								Success Metrics
							</span>{" "}
							in Real-Time
						</motion.h2>
						<motion.p 
							className="text-xl text-muted-foreground leading-relaxed"
						>
							Watch how StudyLoopAI transforms your learning with personalized insights, 
							progress tracking, and adaptive study plans that evolve with your needs.
						</motion.p>
					</motion.div>

					{/* Demo Component */}
					<motion.div className="flex justify-center">
						<HeroResultsDemo />
					</motion.div>

					{/* Additional Context */}
					<motion.div className="text-center mt-16 max-w-2xl mx-auto">
						<p className="text-lg text-muted-foreground">
							Join thousands of students who've already improved their grades, 
							saved study time, and achieved their academic goals with AI-powered learning.
						</p>
					</motion.div>
				</ScrollRevealStagger>
			</div>
		</section>
	);
}