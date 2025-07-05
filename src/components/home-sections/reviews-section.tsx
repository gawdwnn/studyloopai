import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export function ReviewsSection() {
	const testimonials = [
		{
			id: "sarah-johnson",
			name: "Sarah Johnson",
			role: "Computer Science Student",
			university: "Stanford University",
			avatar: "👩‍💻",
			rating: 5,
			content:
				"StudyLoop completely transformed how I study. The AI-generated cuecards helped me ace my algorithms exam with 40% less study time.",
			improvement: "+40% grade improvement",
		},
		{
			id: "marcus-chen",
			name: "Marcus Chen",
			role: "Pre-Med Student",
			university: "Harvard Medical School",
			avatar: "👨‍⚕️",
			rating: 5,
			content:
				"The adaptive quizzes are incredible. They focus on exactly what I need to review. I went from struggling to top 10% of my class.",
			improvement: "Top 10% of class",
		},
		{
			id: "emily-rodriguez",
			name: "Emily Rodriguez",
			role: "Engineering Student",
			university: "MIT",
			avatar: "👩‍🔬",
			rating: 5,
			content:
				"Best study app I've ever used. The AI understands my learning patterns and creates perfect study schedules that actually work.",
			improvement: "10+ hours saved weekly",
		},
		{
			id: "alex-thompson",
			name: "Alex Thompson",
			role: "Business Student",
			university: "Wharton School",
			avatar: "👨‍💼",
			rating: 5,
			content:
				"Game-changer for group studies. The collaboration features and shared decks make studying with classmates so much more effective.",
			improvement: "3.8 to 4.0 GPA",
		},
	];

	//TODO: Add a testimonial section with a grid of testimonials
	//https://21st.dev/sshahaider/testimonials-columns-1/default

	return (
		<section className="py-20 bg-muted/30">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16">
					<h2 className="text-3xl font-bold mb-4">What Students Are Saying</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Don't just take our word for it. Here's what students from top universities say about
						StudyLoop.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-12">
					{testimonials.map((testimonial) => (
						<Card
							key={testimonial.id}
							className="border-0 shadow-lg hover:shadow-xl transition-all duration-300"
						>
							<CardContent className="p-6">
								<div className="flex items-center gap-2 mb-4">
									<div className="flex">
										{Array.from({ length: testimonial.rating }, (_, i) => (
											<Star
												key={`${testimonial.id}-star-${i + 1}`}
												className="w-4 h-4 fill-yellow-400 text-yellow-400"
											/>
										))}
									</div>
									<span className="text-sm text-primary font-semibold bg-primary/10 px-2 py-1 rounded-full">
										{testimonial.improvement}
									</span>
								</div>

								<p className="text-muted-foreground mb-6 leading-relaxed italic">
									"{testimonial.content}"
								</p>

								<div className="flex items-center gap-3">
									<div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center text-2xl">
										{testimonial.avatar}
									</div>
									<div>
										<h4 className="font-semibold">{testimonial.name}</h4>
										<p className="text-sm text-muted-foreground">{testimonial.role}</p>
										<p className="text-xs text-primary font-medium">{testimonial.university}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Overall stats */}
				<div className="text-center">
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 p-6 bg-background rounded-2xl shadow-lg border">
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">4.9/5</div>
							<div className="text-sm text-muted-foreground">Average Rating</div>
						</div>
						<div className="hidden sm:block h-8 w-px bg-border" />
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">100+</div>
							<div className="text-sm text-muted-foreground">Happy Students</div>
						</div>
						<div className="hidden sm:block h-8 w-px bg-border" />
						<div className="text-center">
							<div className="text-3xl font-bold text-primary">3+</div>
							<div className="text-sm text-muted-foreground">Universities</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
