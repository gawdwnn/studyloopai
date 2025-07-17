"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
	const faqs = [
		{
			id: "how-ai-works",
			question: "How does StudyLoop's AI work?",
			answer:
				"Our AI analyzes your study materials and learning patterns to create personalized content. It uses advanced natural language processing to generate summaries, cuecards, and quizzes that match your learning style and pace. The more you use it, the better it becomes at helping you learn effectively.",
		},
		{
			id: "privacy-security",
			question: "Is my study content private and secure?",
			answer:
				"Absolutely. We use enterprise-grade encryption to protect your data. Your study materials are never shared with third parties or used to train our AI models. You maintain full ownership and control of your content, and you can delete it anytime.",
		},
		{
			id: "file-formats",
			question: "What file formats can I upload?",
			answer:
				"StudyLoop supports PDFs, Word documents, PowerPoint presentations, text files, and even images with text. You can also paste content directly or connect with your university's learning management system for seamless integration.",
		},
		{
			id: "pricing",
			question: "How much does StudyLoop cost?",
			answer:
				"We offer a generous free plan that includes basic AI features and limited content uploads. Our Pro plan starts at $9.99/month with unlimited uploads, advanced AI features, and priority support. Students get a 50% discount with a valid .edu email address.",
		},
		{
			id: "spaced-repetition",
			question: "How does the spaced repetition system work?",
			answer:
				"Our AI tracks your performance on each topic and schedules reviews at optimal intervals. Content you struggle with appears more frequently, while topics you've mastered are reviewed less often. This scientifically-proven method improves long-term retention by up to 40%.",
		},
		{
			id: "satisfaction-guarantee",
			question: "What if I'm not satisfied with StudyLoop?",
			answer:
				"We offer a 30-day money-back guarantee for all paid plans. If you're not completely satisfied, contact our support team for a full refund. We're confident you'll love StudyLoop, but we want you to feel secure in your choice.",
		},
		{
			id: "mobile-compatibility",
			question: "Does StudyLoop work on mobile devices?",
			answer:
				"Yes! StudyLoop is fully responsive and works perfectly on smartphones, tablets, and desktops. You can study anywhere, anytime, and your progress syncs across all devices in real-time.",
		},
	];

	return (
		<section className="py-20">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16">
					<h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Everything you need to know about StudyLoop. Can't find the answer you're looking for?
						<a href="/contact" className="text-primary hover:underline ml-1">
							Contact our support team
						</a>
						.
					</p>
				</div>

				<div className="max-w-3xl mx-auto">
					<Accordion type="single" collapsible className="space-y-4">
						{faqs.map((faq) => (
							<AccordionItem
								key={faq.id}
								value={faq.id}
								className="border border-border rounded-lg px-6 bg-background/50 hover:bg-background transition-colors"
							>
								<AccordionTrigger className="text-left font-semibold hover:no-underline py-6">
									{faq.question}
								</AccordionTrigger>
								<AccordionContent className="text-muted-foreground leading-relaxed pb-6">
									{faq.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>

				{/* Support CTA */}
				<div className="text-center mt-12">
					<div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-full text-primary">
						<span className="text-sm font-medium">
							Still have questions? Our support team responds in under 2 hours
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}
