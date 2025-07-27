"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

interface ScrollRevealProps {
	children: React.ReactNode;
	direction?: "up" | "down" | "left" | "right" | "scale" | "fade";
	delay?: number;
	duration?: number;
	distance?: number;
	className?: string;
	trigger?: "top" | "center" | "bottom";
	scrub?: boolean;
	once?: boolean;
}

export function ScrollReveal({
	children,
	direction = "up",
	delay = 0,
	duration = 1,
	distance = 50,
	className = "",
	trigger = "bottom",
	scrub = false,
	once = true,
}: ScrollRevealProps) {
	const elementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Skip on server side
		if (typeof window === "undefined") return;

		const element = elementRef.current;
		if (!element || !(element instanceof Element)) return;

		// Initial state based on direction
		const getInitialState = () => {
			switch (direction) {
				case "up":
					return { y: distance, opacity: 0 };
				case "down":
					return { y: -distance, opacity: 0 };
				case "left":
					return { x: distance, opacity: 0 };
				case "right":
					return { x: -distance, opacity: 0 };
				case "scale":
					return { scale: 0.8, opacity: 0 };
				case "fade":
					return { opacity: 0 };
				default:
					return { y: distance, opacity: 0 };
			}
		};

		// Final state
		const getFinalState = () => {
			switch (direction) {
				case "up":
				case "down":
					return { y: 0, opacity: 1 };
				case "left":
				case "right":
					return { x: 0, opacity: 1 };
				case "scale":
					return { scale: 1, opacity: 1 };
				case "fade":
					return { opacity: 1 };
				default:
					return { y: 0, opacity: 1 };
			}
		};

		// Set initial state
		gsap.set(element, getInitialState());

		// Create scroll trigger
		const animation = gsap.to(element, {
			...getFinalState(),
			duration,
			delay,
			ease: "power2.out",
			scrollTrigger: {
				trigger: element,
				start: `top ${trigger === "top" ? "80%" : trigger === "center" ? "50%" : "80%"}`,
				end: scrub ? "bottom 20%" : undefined,
				scrub: scrub,
				once: once,
				toggleActions: once ? "play none none none" : "play none none reverse",
				// markers: process.env.NODE_ENV === "development", // Enable for debugging
			},
		});

		return () => {
			animation.kill();
		};
	}, [direction, delay, duration, distance, trigger, scrub, once]);

	return (
		<div ref={elementRef} className={className}>
			{children}
		</div>
	);
}

// Specialized components for common patterns
export function ScrollRevealSection({
	children,
	className = "",
	...props
}: Omit<ScrollRevealProps, "direction"> & { className?: string }) {
	return (
		<ScrollReveal
			direction="up"
			duration={0.8}
			className={className}
			{...props}
		>
			{children}
		</ScrollReveal>
	);
}

export function ScrollRevealCard({
	children,
	delay = 0,
	className = "",
	...props
}: Omit<ScrollRevealProps, "direction"> & { className?: string }) {
	return (
		<ScrollReveal
			direction="scale"
			duration={0.6}
			delay={delay}
			className={className}
			{...props}
		>
			{children}
		</ScrollReveal>
	);
}

export function ScrollRevealStagger({
	children,
	staggerDelay = 0.1,
	className = "",
	...props
}: Omit<ScrollRevealProps, "direction"> & {
	staggerDelay?: number;
	className?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Skip on server side
		if (typeof window === "undefined") return;

		const container = containerRef.current;
		if (!container || !(container instanceof Element)) return;

		// Small delay to ensure DOM is ready
		const timeout = setTimeout(() => {
			const items = Array.from(container.children).filter(
				(child) => child instanceof Element
			);
			if (items.length === 0) return;

			// Set initial state for all items
			gsap.set(items, { y: 50, opacity: 0 });

			// Create staggered animation
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: container,
					start: "top 80%",
					once: true,
				},
			});

			tl.to(items, {
				y: 0,
				opacity: 1,
				duration: 0.6,
				stagger: staggerDelay,
				ease: "power2.out",
			});
		}, 50);

		return () => {
			if (timeout) clearTimeout(timeout);
		};
	}, [staggerDelay]);

	return (
		<div ref={containerRef} className={className} {...props}>
			{children}
		</div>
	);
}
