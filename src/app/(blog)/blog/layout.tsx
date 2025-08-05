import { ScrollRevealStagger } from "@/components/scroll-reveal";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Blog | StudyLoop AI",
	description: "Latest articles and updates from StudyLoop AI",
};

export default function BlogLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<section className="relative py-16 lg:py-20 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
				<div className="relative max-w-7xl mx-auto px-6 lg:px-8">
					<ScrollRevealStagger>
						<div className="text-center max-w-3xl mx-auto">
							<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
								<Sparkles className="w-4 h-4 text-primary" />
								<span className="text-sm font-medium">
									Learn smarter, not harder
								</span>
							</div>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
								StudyLoop AI Blog
							</h1>
							<p className="text-lg md:text-xl text-muted-foreground">
								Insights, tips, and updates about AI-powered learning
							</p>
						</div>
					</ScrollRevealStagger>
				</div>
			</section>

			{/* Content Section */}
			<section className="py-16 lg:py-24">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">{children}</div>
			</section>
		</div>
	);
}
