import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 lg:py-28">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-4xl mx-auto">
					<Badge variant="secondary" className="mb-6">
						🎓 AI-Powered Study Platform
					</Badge>
					<h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
						Study Smarter, Not Harder with AI-Powered Learning
					</h1>
					<p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
						Join thousands of students who are transforming their study habits with personalized AI
						tools. Upload your course materials and get instant smart summaries, adaptive quizzes,
						and a study plan that adapts to your learning style.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button
							size="lg"
							className="text-lg px-8 py-6 hover:shadow-lg transition-all duration-300 hover:scale-105"
							asChild
						>
							<Link href="/auth/signup">Start Free Trial</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="text-lg px-8 py-6 hover:shadow-lg transition-all duration-300 hover:scale-105 border-primary hover:bg-primary hover:text-primary-foreground"
							asChild
						>
							<Link href="/flashcards">Try Demo</Link>
						</Button>
					</div>
					<p className="text-sm text-muted-foreground mt-4">
						✨ Free forever plan • Privacy-first • Works with any university
					</p>

					{/* Social Proof */}
					<div className="mt-12 pt-8 border-t border-muted">
						<p className="text-sm text-muted-foreground mb-4">
							Trusted by students at 3+ universities in Canada
						</p>
						<div className="flex items-center justify-center gap-2 text-primary">
							<div className="flex">
								{Array.from({ length: 5 }, (_, i) => (
									<svg
										key={`hero-star-${i + 1}`}
										className="w-5 h-5 fill-yellow-400 text-yellow-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										aria-label={`${i + 1} star rating`}
									>
										<title>{`${i + 1} star rating`}</title>
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
								))}
							</div>
							<span className="font-semibold ml-2">4.9/5</span>
							<span className="text-muted-foreground">(100+ students)</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
