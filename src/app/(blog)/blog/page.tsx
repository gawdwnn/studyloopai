import { CalendarDays, Clock } from "lucide-react";
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
		<div className="max-w-4xl mx-auto">
			<div className="grid gap-8">
				{blogPosts.map((post) => (
					<article
						key={post.slug}
						className="group relative rounded-lg border p-6 hover:border-foreground/50 transition-colors"
					>
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span className="font-medium text-primary">{post.category}</span>
								<span>•</span>
								<div className="flex items-center gap-1">
									<CalendarDays className="h-4 w-4" />
									<time dateTime={post.date}>
										{new Date(post.date).toLocaleDateString("en-US", {
											month: "long",
											day: "numeric",
											year: "numeric",
										})}
									</time>
								</div>
								<span>•</span>
								<div className="flex items-center gap-1">
									<Clock className="h-4 w-4" />
									<span>{post.readTime}</span>
								</div>
							</div>
							<Link
								href={`/blog/${post.slug}`}
								className="group-hover:text-primary transition-colors"
							>
								<h2 className="text-2xl font-semibold tracking-tight">{post.title}</h2>
							</Link>
							<p className="text-muted-foreground">{post.excerpt}</p>
							<Link
								href={`/blog/${post.slug}`}
								className="text-primary hover:underline inline-flex items-center gap-1"
							>
								Read more
								<span aria-hidden="true">→</span>
							</Link>
						</div>
					</article>
				))}
			</div>
		</div>
	);
}
