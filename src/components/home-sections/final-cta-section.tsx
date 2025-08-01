import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Zap } from "lucide-react";
import Link from "next/link";

export function FinalCTASection() {
	const guarantees = [
		{ id: "free-plan", text: "Free forever plan available" },
		{ id: "money-back", text: "30-day money-back guarantee" },
		{ id: "no-card", text: "No credit card required to start" },
		{ id: "cancel-anytime", text: "Cancel anytime" },
	];

	return (
		<section
			className="py-20 text-white relative overflow-hidden"
			style={{
				background:
					"linear-gradient(135deg, var(--homepage-primary), var(--homepage-ai-primary))",
			}}
		>
			{/* Background Pattern */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute top-10 left-10 w-32 h-32 border border-current rounded-full" />
				<div className="absolute bottom-10 right-10 w-24 h-24 border border-current rounded-full" />
				<div className="absolute top-1/2 left-1/3 w-16 h-16 border border-current rounded-full" />
			</div>

			<div className="container mx-auto px-4 relative">
				<div className="text-center max-w-4xl mx-auto">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
						<Zap className="w-4 h-4" />
						<span className="text-sm font-medium">
							Limited Time: free for Students
						</span>
					</div>

					<h2 className="text-3xl md:text-5xl font-bold mb-6 homepage-text-balanced">
						Ready to Transform Your Learning?
					</h2>
					<p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
						Join thousands of students who have already improved their grades
						with our AI-powered study tools. Start your journey to academic
						success today.
					</p>

					{/* Value Props */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
						{guarantees.map((guarantee) => (
							<div
								key={guarantee.id}
								className="flex items-center gap-2 text-sm bg-white/10 rounded-lg p-3"
							>
								<CheckCircle className="w-4 h-4 flex-shrink-0" />
								<span>{guarantee.text}</span>
							</div>
						))}
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
						<Button
							size="lg"
							variant="secondary"
							className="text-lg px-8 py-6 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white text-[var(--homepage-primary)] hover:bg-white/90"
							asChild
						>
							<Link href="/auth/signin" className="flex items-center gap-2">
								Start Free Trial
								<ArrowRight className="w-5 h-5" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="text-lg px-8 py-6 border-white text-white bg-transparent hover:bg-white hover:text-[var(--homepage-primary)] hover:shadow-xl transition-all duration-300 hover:scale-105"
							asChild
						>
							<Link href="/cuecards">Try Demo First</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
