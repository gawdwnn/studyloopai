import { ScrollRevealStagger } from "@/components/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLANS } from "@/lib/config/plans";
import { PLAN_IDS } from "@/lib/database/types";
import {
	BarChart3,
	BookOpen,
	Brain,
	Check,
	Clock,
	FileText,
	HelpCircle,
	MessageSquare,
	Shield,
	Sparkles,
	Users,
	X,
	Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
	{
		icon: <Brain className="w-5 h-5" />,
		title: "AI-Powered Summaries",
		description: "Generate comprehensive summaries from your study materials",
	},
	{
		icon: <FileText className="w-5 h-5" />,
		title: "Smart Cue Cards",
		description: "Create flashcards automatically from your notes",
	},
	{
		icon: <BookOpen className="w-5 h-5" />,
		title: "MCQ Generation",
		description: "Practice with AI-generated multiple choice questions",
	},
	{
		icon: <MessageSquare className="w-5 h-5" />,
		title: "AI Tutor",
		description: "Get instant answers to your study questions",
	},
	{
		icon: <BarChart3 className="w-5 h-5" />,
		title: "Progress Analytics",
		description: "Track your learning progress with detailed insights",
	},
	{
		icon: <Clock className="w-5 h-5" />,
		title: "24/7 Availability",
		description: "Study anytime, anywhere with our always-on platform",
	},
];

const faqs = [
	{
		question: "Can I switch between monthly and yearly billing?",
		answer:
			"Yes! You can switch between monthly ($4.99/month) and yearly ($3.99/month billed annually) at any time. When you switch to yearly, you'll save $12 per year.",
	},
	{
		question: "Is there a free trial for the Pro plan?",
		answer:
			"Yes, we offer a 7-day free trial for the Pro plan. No credit card required to start.",
	},
	{
		question: "What's included in the Free plan?",
		answer:
			"The Free plan includes basic AI-powered study tools, up to 3 document uploads, limited AI chat (10 messages/day), basic note generation, and community support.",
	},
	{
		question: "What's the difference between monthly and yearly Pro plans?",
		answer:
			"Both include all Pro features. The yearly plan offers the same features at a discounted rate ($3.99/month vs $4.99/month), plus early access to new features and study analytics & insights.",
	},
	{
		question: "Can I cancel my subscription?",
		answer:
			"You can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.",
	},
	{
		question: "Is my data secure?",
		answer:
			"Absolutely. We use industry-standard encryption and security practices to protect your data. We never share your personal information or study materials.",
	},
];

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<section className="relative py-20 lg:py-28 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
				<div className="relative max-w-7xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<div className="text-center max-w-3xl mx-auto">
							<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
								<Sparkles className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium">
									Simple, transparent pricing
								</span>
							</div>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
								Choose Your Learning Journey
							</h1>
							<p className="text-lg md:text-xl text-muted-foreground">
								Start free and upgrade as you grow. No hidden fees, no
								surprises.
							</p>
						</div>
					</ScrollRevealStagger>
				</div>
			</section>

			{/* Pricing Cards */}
			<section className="py-16 lg:py-24">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<div className="grid md:grid-cols-3 gap-8">
							{PLANS.map((plan) => {
								const isFree = plan.id === PLAN_IDS.FREE;
								const isYearly = plan.id === PLAN_IDS.YEARLY;
								const isMonthly = plan.id === PLAN_IDS.MONTHLY;

								return (
									<Card
										key={plan.id}
										className={`relative p-8 ${
											plan.isPopular
												? "border-primary shadow-xl scale-105"
												: "border-border"
										}`}
									>
										{plan.isPopular && (
											<div className="absolute -top-4 left-1/2 -translate-x-1/2">
												<div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
													Most Popular
												</div>
											</div>
										)}
										<div className="mb-8">
											<h3 className="text-2xl font-bold mb-2">
												{plan.name}
												{isYearly && (
													<span className="text-sm font-normal text-muted-foreground ml-2">
														(Yearly)
													</span>
												)}
												{isMonthly && (
													<span className="text-sm font-normal text-muted-foreground ml-2">
														(Monthly)
													</span>
												)}
											</h3>
											<div className="flex items-baseline mb-2">
												<span className="text-4xl font-bold">
													${plan.price.toFixed(isFree ? 0 : 2)}
												</span>
												{!isFree && (
													<span className="text-muted-foreground ml-1">
														{plan.billingPeriod}
													</span>
												)}
											</div>
											{plan.annualPrice && (
												<p className="text-sm text-muted-foreground mb-2">
													Billed ${plan.annualPrice.toFixed(2)} annually
												</p>
											)}
											<p className="text-muted-foreground">
												{plan.description}
											</p>
											{plan.savingsInfo && (
												<p className="text-sm text-primary mt-2">
													{plan.savingsInfo}
												</p>
											)}
										</div>

										<Button
											className="w-full mb-8"
											variant={isFree ? "outline" : "default"}
											size="lg"
											asChild
										>
											<Link
												href={
													isFree
														? "/auth/signin"
														: isMonthly
															? "/auth/signin?plan=monthly"
															: "/auth/signin?plan=yearly"
												}
											>
												{isFree ? "Get Started" : "Start Free Trial"}
											</Link>
										</Button>

										<div className="space-y-4">
											<div className="text-sm font-medium">Includes:</div>
											<ul className="space-y-3">
												{plan.features
													.filter((feature) => feature.included)
													.map((feature) => (
														<li
															key={feature.id}
															className="flex items-start gap-3"
														>
															<Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
															<span className="text-sm">{feature.name}</span>
														</li>
													))}
											</ul>
											{plan.features.some((f) => !f.included) && (
												<div className="pt-4 border-t">
													<ul className="space-y-3">
														{plan.features
															.filter((feature) => !feature.included)
															.map((feature) => (
																<li
																	key={feature.id}
																	className="flex items-start gap-3"
																>
																	<X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
																	<span className="text-sm text-muted-foreground">
																		{feature.name}
																	</span>
																</li>
															))}
													</ul>
												</div>
											)}
										</div>
									</Card>
								);
							})}
						</div>
					</ScrollRevealStagger>
				</div>
			</section>

			{/* Features Grid */}
			<section className="py-16 lg:py-24 bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<div className="text-center mb-12">
							<h2 className="text-3xl md:text-4xl font-bold mb-4">
								Everything You Need to Succeed
							</h2>
							<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
								Powerful features designed to enhance your learning experience
							</p>
						</div>
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
							{features.map((feature) => (
								<Card key={feature.title} className="p-6">
									<div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
										{feature.icon}
									</div>
									<h3 className="text-lg font-semibold mb-2">
										{feature.title}
									</h3>
									<p className="text-muted-foreground">{feature.description}</p>
								</Card>
							))}
						</div>
					</ScrollRevealStagger>
				</div>
			</section>

			{/* Trust Badges */}
			<section className="py-16 lg:py-24">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<div className="grid md:grid-cols-3 gap-8 text-center">
							<div>
								<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
									<Shield className="w-8 h-8 text-primary" />
								</div>
								<h3 className="text-lg font-semibold mb-2">
									Bank-Level Security
								</h3>
								<p className="text-muted-foreground">
									Your data is encrypted and secure with industry-standard
									protection
								</p>
							</div>
							<div>
								<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
									<Users className="w-8 h-8 text-primary" />
								</div>
								<h3 className="text-lg font-semibold mb-2">50,000+ Students</h3>
								<p className="text-muted-foreground">
									Join thousands of students already improving their grades
								</p>
							</div>
							<div>
								<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
									<Zap className="w-8 h-8 text-primary" />
								</div>
								<h3 className="text-lg font-semibold mb-2">Instant Setup</h3>
								<p className="text-muted-foreground">
									Start studying smarter in less than 2 minutes
								</p>
							</div>
						</div>
					</ScrollRevealStagger>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="py-16 lg:py-24 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<div className="text-center mb-12">
							<h2 className="text-3xl md:text-4xl font-bold mb-4">
								Frequently Asked Questions
							</h2>
							<p className="text-lg text-muted-foreground">
								Everything you need to know about StudyLoop AI pricing
							</p>
						</div>
						<div className="space-y-6">
							{faqs.map((faq) => (
								<Card key={faq.question} className="p-6">
									<div className="flex items-start gap-4">
										<HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
										<div>
											<h3 className="font-semibold mb-2">{faq.question}</h3>
											<p className="text-muted-foreground">{faq.answer}</p>
										</div>
									</div>
								</Card>
							))}
						</div>
					</ScrollRevealStagger>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 lg:py-24">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<Card className="relative overflow-hidden p-12 lg:p-16">
							<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
							<div className="relative text-center max-w-3xl mx-auto">
								<h2 className="text-3xl md:text-4xl font-bold mb-4">
									Start Your Free Trial Today
								</h2>
								<p className="text-lg text-muted-foreground mb-8">
									Join thousands of students who are already studying smarter,
									not harder.
								</p>
								<div className="flex gap-4 justify-center">
									<Button size="lg" asChild>
										<Link href="/auth/signin">Get Started Free</Link>
									</Button>
									<Button size="lg" variant="outline" asChild>
										<Link href="/contact-sales">Talk to Sales</Link>
									</Button>
								</div>
								<p className="text-sm text-muted-foreground mt-4">
									No credit card required • 7-day free trial
								</p>
							</div>
						</Card>
					</ScrollRevealStagger>
				</div>
			</section>
		</div>
	);
}
