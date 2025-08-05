"use client";

import { ParallaxWatermark } from "@/components/home-sections/parallax-watermark";
import { ScrollRevealStagger } from "@/components/scroll-reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	ArrowRight,
	Github,
	Linkedin,
	type LucideIcon,
	Sparkles,
	Twitter,
	Zap,
} from "lucide-react";
import Link from "next/link";
import type React from "react";

// Data Definitions for Footer Content
const featureLinks = [
	{ name: "AI Summaries", href: "/dashboard/adaptive-learning/summaries" },
	{
		name: "AI Notes",
		href: "/dashboard/adaptive-learning/golden-notes",
	},
	{ name: "AI Cuecards", href: "/dashboard/adaptive-learning/cuecards" },
	{
		name: "AI Multiple Choice Questions",
		href: "/dashboard/adaptive-learning/multiple-choice",
	},
	{ name: "Ask AI Tutor", href: "/dashboard/ask-ai" },
];

const resourceLinks = [
	{ name: "Study Materials", href: "/dashboard/course-materials" },
	{ name: "Learning Blog", href: "/blog" },
];

const companyLinks = [{ name: "Pricing", href: "/pricing" }];

const socialLinks = [
	{
		name: "LinkedIn",
		href: "https://linkedin.com/company/studyloop",
		icon: Linkedin,
	},
	{ name: "Twitter", href: "https://twitter.com/studyloop", icon: Twitter },
	{
		name: "Github",
		href: "https://github.com/gawdwnn/studyloopai",
		icon: Github,
	},
];

const legalLinks = [
	{ name: "Terms of Service", href: "/legal/terms-of-service" },
	{ name: "Privacy Policy", href: "/legal/privacy-policy" },
	{ name: "Cookie Policy", href: "/legal/cookie-policy" },
];

const ctaCardsData = [
	{
		variant: "pink",
		icon: <Sparkles className="w-6 h-6 text-pink-400" />,
		preTitle: "Want to see our pricing?",
		title: "Check out our affordable plans.",
		buttonText: "View Pricing",
		buttonLink: "/pricing",
		buttonProps: {
			variant: "ghost",
			className:
				"text-pink-300 hover:text-white hover:bg-pink-500/20 group-hover:translate-x-2",
		},
	},
	{
		variant: "blue",
		icon: <Zap className="w-6 h-6 text-blue-400" />,
		preTitle: "Ready to transform learning?",
		title: "Yes, let's get started!",
		buttonText: "Start Free",
		buttonLink: "/auth/signin",
		buttonProps: {
			className:
				"bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 group-hover:translate-x-2",
		},
	},
] as const;

// Reusable Components
type FooterCtaCardProps = {
	variant: "pink" | "blue";
	icon: React.ReactNode;
	preTitle: string;
	title: string;
	buttonText: string;
	buttonLink: string;
	buttonProps: React.ComponentProps<typeof Button>;
};

const ctaCardStyles = {
	pink: {
		container:
			"from-pink-500/10 via-pink-400/5 to-rose-500/10 border-pink-500/20 hover:border-pink-400/30 hover:shadow-pink-500/10",
		iconContainer: "bg-pink-500/20",
		preTitle: "text-pink-300",
		gradientOverlay: "from-pink-500/5",
	},
	blue: {
		container:
			"from-blue-500/10 via-cyan-400/5 to-blue-600/10 border-blue-500/20 hover:border-blue-400/30 hover:shadow-blue-500/10",
		iconContainer: "bg-blue-500/20",
		preTitle: "text-blue-300",
		gradientOverlay: "from-blue-500/5",
	},
};

function FooterCtaCard({
	variant,
	icon,
	preTitle,
	title,
	buttonText,
	buttonLink,
	buttonProps,
}: FooterCtaCardProps) {
	const styles = ctaCardStyles[variant];
	return (
		<div
			className={cn(
				"group relative p-8 rounded-2xl bg-gradient-to-br transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
				styles.container
			)}
		>
			<div className="relative z-10">
				<div className="flex items-center gap-3 mb-4">
					<div
						className={cn(
							"w-12 h-12 rounded-full flex items-center justify-center",
							styles.iconContainer
						)}
					>
						{icon}
					</div>
					<span className={cn("text-sm font-medium", styles.preTitle)}>
						{preTitle}
					</span>
				</div>
				<h3 className="text-2xl font-bold mb-4 text-white">{title}</h3>
				<Button
					size="lg"
					{...buttonProps}
					className={cn(
						"mt-4 transition-all duration-300",
						buttonProps.className
					)}
					asChild
				>
					<Link href={buttonLink} className="flex items-center gap-2">
						<span>{buttonText}</span>
						<ArrowRight className="w-5 h-5" />
					</Link>
				</Button>
			</div>
			<div
				className={cn(
					"absolute inset-0 rounded-2xl bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500",
					styles.gradientOverlay
				)}
			/>
		</div>
	);
}

type FooterLinkColumnProps = {
	title: string;
	links: { name: string; href: string }[];
};

function FooterLinkColumn({ title, links }: FooterLinkColumnProps) {
	return (
		<div>
			<h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-6">
				{title}
			</h3>
			<ul className="space-y-4">
				{links.map((item) => (
					<li key={item.name}>
						<Link
							href={item.href}
							className="text-slate-300 hover:text-white transition-colors duration-200"
						>
							{item.name}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

type ContactColumnProps = {
	socialLinks: { name: string; href: string; icon: LucideIcon }[];
};

function ContactColumn({ socialLinks }: ContactColumnProps) {
	return (
		<div>
			<h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-6">
				CONTACT
			</h3>
			<div className="space-y-4">
				<div>
					<a
						href="mailto:hello@studyloop.ai"
						className="text-slate-300 hover:text-white transition-colors duration-200"
					>
						studyloopai@gmail.com
					</a>
				</div>
				<div>
					<span className="text-slate-300">+65 9123 4567</span>
				</div>
				<div className="flex gap-4 pt-2">
					{socialLinks.map((social) => (
						<a
							key={social.name}
							href={social.href}
							aria-label={social.name}
							className="text-slate-400 hover:text-white transition-colors duration-200"
						>
							<social.icon className="w-5 h-5" />
						</a>
					))}
				</div>
			</div>
		</div>
	);
}

export function HomeFooter() {
	return (
		<footer className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
			{/* Animated Background Elements */}
			<div className="absolute inset-0 opacity-10">
				{/* Shapes for the background */}
				<div className="absolute top-10 left-10 w-32 h-32 border border-current rounded-full" />
				<div className="absolute bottom-10 right-10 w-24 h-24 border border-current rounded-full" />
				<div className="absolute top-1/2 left-1/3 w-16 h-16 border border-current rounded-full" />
				<div className="absolute top-1/4 right-1/4 w-20 h-20 border border-current" />
				<div className="absolute bottom-1/3 left-1/2 w-48 h-12 border border-current" />
				<div className="absolute top-3/4 left-1/4 w-12 h-12 border border-current rotate-45" />
				<div className="absolute bottom-1/2 right-1/3 w-8 h-32 border border-current" />
			</div>

			{/* Background Branding with Parallax */}
			<ParallaxWatermark
				text="StudyLoopAI"
				repeat={3}
				parallaxType="horizontal"
			/>

			<div className="relative mx-auto max-w-7xl px-6 lg:px-8">
				{/* Hero CTA Cards Section */}
				<div className="pt-20 pb-16">
					<ScrollRevealStagger staggerDelay={0.2}>
						<div className="grid md:grid-cols-2 gap-6 mb-20">
							{ctaCardsData.map((card) => (
								<FooterCtaCard key={card.title} {...card} />
							))}
						</div>
					</ScrollRevealStagger>
				</div>

				{/* Links Grid */}
				<div className="pb-16">
					<ScrollRevealStagger staggerDelay={0.1}>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
							<FooterLinkColumn title="FEATURES" links={featureLinks} />
							<FooterLinkColumn title="RESOURCES" links={resourceLinks} />
							<FooterLinkColumn title="COMPANY" links={companyLinks} />
							<ContactColumn socialLinks={socialLinks} />
						</div>
					</ScrollRevealStagger>
				</div>

				{/* Bottom Bar */}
				<div className="border-t border-slate-700/50 py-8">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						{/* Legal Links */}
						<div className="flex flex-wrap gap-6 text-sm">
							{legalLinks.map((link) => (
								<Link
									key={link.name}
									href={link.href}
									className="text-slate-400 hover:text-white transition-colors"
								>
									{link.name}
								</Link>
							))}
						</div>

						{/* Copyright */}
						<div className="text-sm text-slate-400">
							© {new Date().getFullYear()} StudyLoop AI. All rights reserved.
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
