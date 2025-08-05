import { ScrollRevealStagger } from "@/components/scroll-reveal";
import { Card } from "@/components/ui/card";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import Link from "next/link";

// This would typically come from a CMS or database
const blogPosts = [
	{
		slug: "getting-started-with-ai-learning",
		title: "Getting Started with AI-Powered Learning",
		excerpt:
			"Learn how to leverage artificial intelligence to enhance your study experience and improve your learning outcomes.",
		date: "2024-03-20",
		readTime: "5 min read",
		category: "Guides",
	},
	{
		slug: "effective-study-techniques",
		title: "Effective Study Techniques with AI",
		excerpt:
			"Discover proven study techniques that work best with AI-powered learning tools and how to integrate them into your routine.",
		date: "2024-03-18",
		readTime: "7 min read",
		category: "Tips & Tricks",
	},
	{
		slug: "future-of-education",
		title: "The Future of Education: AI's Role",
		excerpt:
			"Explore how artificial intelligence is transforming education and what it means for students and educators.",
		date: "2024-03-15",
		readTime: "6 min read",
		category: "Insights",
	},
];

export default function BlogPage() {
	return (
		<ScrollRevealStagger>
			<div className="grid gap-6 max-w-4xl mx-auto">
				{blogPosts.map((post) => (
					<Card
						key={post.slug}
						className="group p-6 hover:shadow-lg transition-all duration-300"
					>
						<article>
							<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
								<span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
									{post.category}
								</span>
								<div className="flex items-center gap-1">
									<Calendar className="w-4 h-4" />
									<time dateTime={post.date}>
										{new Date(post.date).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</time>
								</div>
								<div className="flex items-center gap-1">
									<Clock className="w-4 h-4" />
									<span>{post.readTime}</span>
								</div>
							</div>

							<Link
								href={`/blog/${post.slug}`}
								className="block group-hover:text-primary transition-colors"
							>
								<h2 className="text-2xl font-bold mb-3">{post.title}</h2>
							</Link>

							<p className="text-muted-foreground mb-4 line-clamp-2">
								{post.excerpt}
							</p>

							<Link
								href={`/blog/${post.slug}`}
								className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
							>
								Read more
								<ArrowRight className="w-4 h-4" />
							</Link>
						</article>
					</Card>
				))}
			</div>
		</ScrollRevealStagger>
	);
}
