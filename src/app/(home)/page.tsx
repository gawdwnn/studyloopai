import {
	BeforeAfterDemo,
	FAQSection,
	FinalCTASection,
	HeroSection,
	PersonalizationDemo,
} from "@/components/home-sections";
import { HomepageSection } from "@/components/home-sections/animated-section";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HomeNavbar } from "@/components/home-sections/home-navbar";
import { HomeFooter } from "@/components/home-sections/home-footer";

export default function Home() {
	return (
		<div className="relative flex min-h-screen flex-col">
			<HomeNavbar />
			<main className="flex-1">
			{/* Hero Section - Hook visitors instantly with AI companion */}
			<HeroSection />

			{/* Before/After Demo - Show clear transformation */}
			<HomepageSection
				background="muted"
				title="See the Transformation"
				subtitle="Compare the frustrating experience of generic study tools with the personalized power of your AI study companion"
			>
				<ScrollReveal direction="scale" duration={0.8} delay={0.2}>
					<BeforeAfterDemo />
				</ScrollReveal>
			</HomepageSection>

			{/* Personalization Demo - Interactive proof of concept */}
			<HomepageSection
				background="feature"
				title="Customize Your Learning Experience"
				subtitle="Your AI study companion learns your preferences and creates a completely personalized learning experience"
			>
				<ScrollReveal direction="up" duration={0.8} delay={0.3}>
					<PersonalizationDemo />
				</ScrollReveal>
			</HomepageSection>

			{/* FAQ Section - Address common questions before support */}
			<ScrollReveal direction="fade" duration={1}>
				<FAQSection />
			</ScrollReveal>

			{/* Final CTA - Convert visitors */}
			<ScrollReveal direction="up" duration={0.8}>
				<FinalCTASection />
			</ScrollReveal>
			</main>
			<HomeFooter />
		</div>
	);
}
