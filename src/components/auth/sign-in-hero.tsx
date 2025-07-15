"use client";

import { quotes } from "@/lib/data/auth-quotes";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function SignInHero() {
	const [currentQuote, setCurrentQuote] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentQuote((prev) => (prev + 1) % quotes.length);
		}, 5000);
		return () => clearInterval(interval);
	}, []);

	return (
		<motion.div
			className="hidden md:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 relative overflow-hidden flex-col justify-center items-center p-8 lg:p-12 min-h-[40vh] md:min-h-screen"
			initial={{ opacity: 0, x: -50 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.8 }}
		>
			<div className="absolute inset-0 opacity-10">
				<div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-xl" />
				<div className="absolute bottom-20 right-20 w-24 h-24 bg-white rounded-full blur-lg" />
				<div className="absolute top-1/2 left-10 w-16 h-16 bg-white rounded-full blur-md" />
			</div>
			<AnimatePresence mode="wait">
				<motion.div
					className="max-w-sm lg:max-w-md text-center text-white z-10"
					key={quotes[currentQuote].author}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.6 }}
				>
					<blockquote className="text-lg xl:text-2xl leading-relaxed mb-4 italic font-medium">
						&quot;{quotes[currentQuote].text}&quot;
					</blockquote>
					<div className="flex items-center justify-center space-x-2 lg:space-x-3">
						<span className="font-semibold text-base lg:text-lg opacity-80">
							— {quotes[currentQuote].author}
						</span>
					</div>
				</motion.div>
			</AnimatePresence>
			<div className="flex justify-center space-x-2 mt-4">
				{quotes.map((quote, index) => (
					<button
						key={quote.author}
						type="button"
						onClick={() => setCurrentQuote(index)}
						className={`w-2 h-2 rounded-full transition-all duration-300 ${
							index === currentQuote ? "bg-white" : "bg-white/30"
						}`}
						aria-label={`Show quote by ${quote.author}`}
					/>
				))}
			</div>
		</motion.div>
	);
}
