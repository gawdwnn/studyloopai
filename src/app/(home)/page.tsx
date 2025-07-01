import {
	FAQSection,
	FeaturesSection,
	FinalCTASection,
	HeroSection,
	ReviewsSection,
	WhyChooseUsSection,
} from "@/components/home-sections";

export default function Home() {
	return (
		<div className="flex flex-col min-h-screen">
			{/* Hero Section - Hook visitors instantly */}
			<HeroSection />

			{/* Company Logos - Add instant credibility */}
			{/* <CompanyLogosSection /> */}

			{/* Features Section - Highlight what sets your app apart */}
			<FeaturesSection />

			{/* Why Choose Us Section - Make strengths obvious */}
			<WhyChooseUsSection />

			{/* Reviews Section - Let happy users convince the rest */}
			<ReviewsSection />

			{/* FAQ Section - Reduce hesitation with smart answers */}
			<FAQSection />

			{/* Final CTA - Wrap up with confident CTA */}
			<FinalCTASection />
		</div>
	);
}
