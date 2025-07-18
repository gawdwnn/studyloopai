"use client";

import { useEffect, useRef } from "react";

interface ParallaxWatermarkProps {
	text: string;
	repeat?: number;
	className?: string;
	parallaxType?: "horizontal" | "fade" | "scale" | "none";
}

export function ParallaxWatermark({ 
	text, 
	repeat = 3,
	className = "",
	parallaxType = "horizontal" 
}: ParallaxWatermarkProps) {
	const watermarkRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (parallaxType === "none") return;

		const handleScroll = () => {
			if (!watermarkRef.current || !containerRef.current) return;

			const rect = containerRef.current.getBoundingClientRect();
			const windowHeight = window.innerHeight;

			// Only apply parallax when footer is in viewport
			const footerInView = rect.top < windowHeight && rect.bottom > 0;

			if (footerInView) {
				const scrollProgress = Math.max(0, (windowHeight - rect.top) / windowHeight);

				switch (parallaxType) {
					case "horizontal": {
						const horizontalDrift = scrollProgress * 5; // Subtle 5% drift
						watermarkRef.current.style.transform = `translateY(25%) translateX(${horizontalDrift}%) scaleX(1.1)`;
						break;
					}
					case "fade": {
						const opacity = Math.max(0.5, 1 - scrollProgress * 0.3);
						watermarkRef.current.style.opacity = opacity.toString();
						break;
					}
					case "scale": {
						const scale = 1.1 + scrollProgress * 0.1;
						watermarkRef.current.style.transform = `translateY(25%) scale(${scale}, 1)`;
						break;
					}
				}
			}
		};

		// Set initial state
		if (watermarkRef.current) {
			watermarkRef.current.style.transform = "translateY(25%) scaleX(1.1)";
			watermarkRef.current.style.opacity = "1";
		}

		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll(); // Run once on mount

		return () => window.removeEventListener("scroll", handleScroll);
	}, [parallaxType]);

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden"
		>
			<div
				ref={watermarkRef}
				className={`text-[35vw] md:text-[30vw] lg:text-[25vw] xl:text-[350px] font-black text-white/[0.015] select-none whitespace-nowrap leading-none tracking-tighter will-change-transform ${className}`}
				style={{ transform: "translateY(25%) scaleX(1.1)", opacity: 1 }}
			>
				{Array(repeat).fill(text).join("")}
			</div>
		</div>
	);
}