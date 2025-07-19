"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

interface AnimatedSectionProps {
	children: React.ReactNode;
	className?: string;
	id?: string;
	background?: "default" | "muted" | "feature";
}

export function AnimatedSection({
	children,
	className = "",
	id,
	background = "default",
}: AnimatedSectionProps) {
	const sectionRef = useRef<HTMLElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const timelineRef = useRef<gsap.core.Timeline | null>(null);

	useEffect(() => {
		// Skip on server side
		if (typeof window === "undefined") return;

		const section = sectionRef.current;
		const content = contentRef.current;
		if (!section || !content) return;

		// Wait for DOM to be ready
		const timeout = setTimeout(() => {
			// Find different types of elements to animate
			const headings = Array.from(content.querySelectorAll("h1, h2, h3, h4, h5, h6")).filter(
				(el) => el instanceof Element
			);
			const paragraphs = Array.from(content.querySelectorAll("p")).filter(
				(el) => el instanceof Element
			);
			const buttons = Array.from(content.querySelectorAll("button, a[role='button'], .btn")).filter(
				(el) => el instanceof Element
			);
			const cards = Array.from(content.querySelectorAll("[class*='card'], [class*='Card']")).filter(
				(el) => el instanceof Element
			);
			const images = Array.from(content.querySelectorAll("img, svg")).filter(
				(el) => el instanceof Element
			);
			const lists = Array.from(content.querySelectorAll("ul, ol")).filter(
				(el) => el instanceof Element
			);

			// Only proceed if we have valid elements
			const allElements = [...headings, ...paragraphs, ...buttons, ...cards, ...images, ...lists];
			if (allElements.length === 0) return;

			// Create timeline for section animations
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top 85%",
					end: "bottom 15%",
					once: true,
					// markers: process.env.NODE_ENV === "development"
				},
			});

			// Set initial states only for valid elements
			if (headings.length > 0) gsap.set(headings, { y: 50, opacity: 0 });
			if (paragraphs.length > 0) gsap.set(paragraphs, { y: 50, opacity: 0 });
			if (buttons.length > 0) gsap.set(buttons, { y: 50, opacity: 0 });
			if (cards.length > 0) gsap.set(cards, { scale: 0.9, y: 30, opacity: 0 });
			if (images.length > 0) gsap.set(images, { y: 50, opacity: 0 });
			if (lists.length > 0) gsap.set(lists, { y: 50, opacity: 0 });

			// Animate headings first
			if (headings.length > 0) {
				tl.to(headings, {
					y: 0,
					opacity: 1,
					duration: 0.8,
					stagger: 0.1,
					ease: "power2.out",
				});
			}

			// Then paragraphs
			if (paragraphs.length > 0) {
				tl.to(
					paragraphs,
					{
						y: 0,
						opacity: 1,
						duration: 0.6,
						stagger: 0.05,
						ease: "power2.out",
					},
					"-=0.4"
				);
			}

			// Then interactive elements
			if (buttons.length > 0) {
				tl.to(
					buttons,
					{
						y: 0,
						opacity: 1,
						duration: 0.5,
						stagger: 0.1,
						ease: "back.out(1.7)",
					},
					"-=0.2"
				);
			}

			// Cards with scale effect
			if (cards.length > 0) {
				tl.to(
					cards,
					{
						scale: 1,
						y: 0,
						opacity: 1,
						duration: 0.6,
						stagger: 0.1,
						ease: "back.out(1.7)",
					},
					"-=0.3"
				);
			}

			// Images and icons
			if (images.length > 0) {
				tl.to(
					images,
					{
						y: 0,
						opacity: 1,
						duration: 0.5,
						stagger: 0.05,
						ease: "power2.out",
					},
					"-=0.4"
				);
			}

			// Lists last
			if (lists.length > 0) {
				tl.to(
					lists,
					{
						y: 0,
						opacity: 1,
						duration: 0.5,
						stagger: 0.05,
						ease: "power2.out",
					},
					"-=0.3"
				);
			}

			// Store timeline for cleanup
			timelineRef.current = tl;
		}, 100); // Small delay to ensure DOM is ready

		return () => {
			if (timeout) clearTimeout(timeout);
			if (timelineRef.current) {
				timelineRef.current.kill();
			}
		};
	}, []);

	const backgroundClasses = {
		default: "",
		muted: "bg-muted/30",
		feature: "homepage-feature-bg",
	};

	return (
		<section
			ref={sectionRef}
			className={`py-20 ${backgroundClasses[background]} ${className}`}
			id={id}
		>
			<div className="container mx-auto px-4">
				<div ref={contentRef}>{children}</div>
			</div>
		</section>
	);
}

// Specialized section component for homepage
export function HomepageSection({
	title,
	subtitle,
	children,
	background = "default",
	className = "",
	...props
}: {
	title?: string;
	subtitle?: string;
	children: React.ReactNode;
	background?: "default" | "muted" | "feature";
	className?: string;
} & React.HTMLAttributes<HTMLElement>) {
	return (
		<AnimatedSection background={background} className={className} {...props}>
			{(title || subtitle) && (
				<div className="text-center mb-16">
					{title && <h2 className="text-3xl lg:text-4xl font-bold mb-4">{title}</h2>}
					{subtitle && (
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
					)}
				</div>
			)}
			{children}
		</AnimatedSection>
	);
}
