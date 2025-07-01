import { CalendarDays, Clock } from "lucide-react";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";

// This would typically come from a CMS or database
const blogPosts = {
	"getting-started-with-ai-learning": {
		title: "Getting Started with AI-Powered Learning",
		content: `
# Getting Started with AI-Powered Learning

Artificial Intelligence is revolutionizing the way we learn and study. In this comprehensive guide, we'll explore how you can leverage AI to enhance your learning experience.

## Understanding AI in Education

AI-powered learning tools can adapt to your individual learning style, pace, and needs. They provide personalized feedback and recommendations, making your study sessions more effective.

## Key Benefits of AI Learning

- Personalized learning paths
- Adaptive difficulty levels
- Real-time feedback and corrections
- Smart study scheduling

## Getting Started

To make the most of AI-powered learning, start by identifying your learning goals and preferences. Then, explore the various AI tools available and choose the ones that best suit your needs.

## Best Practices

Remember that AI is a tool to enhance your learning, not replace it. Combine AI-powered tools with traditional study methods for the best results.
    `,
		date: "2024-03-20",
		readTime: "5 min read",
		category: "Guides",
	},
};

interface Props {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const post = blogPosts[slug as keyof typeof blogPosts];

	if (!post) {
		return {
			title: "Post Not Found | StudyLoop AI Blog",
			description: "The requested blog post could not be found.",
		};
	}

	return {
		title: `${post.title} | StudyLoop AI Blog`,
		description: post.content.slice(0, 160),
	};
}

export default async function BlogPostPage({ params }: Props) {
	const { slug } = await params;
	const post = blogPosts[slug as keyof typeof blogPosts];

	if (!post) {
		return (
			<div className="max-w-4xl mx-auto text-center py-12">
				<h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
				<p className="text-muted-foreground mb-8">
					The blog post you're looking for doesn't exist.
				</p>
				<Link href="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
					← Back to blog
				</Link>
			</div>
		);
	}

	return (
		<article className="max-w-4xl mx-auto">
			<header className="mb-8">
				<div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
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
				<h1 className="text-4xl font-bold mb-4">{post.title}</h1>
			</header>

			<div className="prose prose-lg dark:prose-invert max-w-none">
				<MDXRemote source={post.content} />
			</div>

			<div className="mt-12 pt-8 border-t">
				<Link href="/blog" className="text-primary hover:underline inline-flex items-center gap-1">
					← Back to blog
				</Link>
			</div>
		</article>
	);
}
