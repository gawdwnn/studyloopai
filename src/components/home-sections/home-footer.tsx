import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	ArrowRight,
	Brain,
	FileText,
	Github,
	GraduationCap,
	Linkedin,
	Mail,
	Sparkles,
	Twitter,
	Zap,
} from "lucide-react";
import Link from "next/link";

export function HomeFooter() {
	return (
		<footer className="bg-gradient-to-br from-background via-muted/20 to-accent/5 border-t">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Main Footer Content */}
				<div className="py-16">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
						{/* Brand Section */}
						<div className="lg:col-span-1">
							<div className="flex items-center gap-2 mb-4">
								<div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
									<Brain className="w-4 h-4 text-white" />
								</div>
								<span className="font-bold text-xl">StudyLoop</span>
								<Badge
									variant="secondary"
									className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
								>
									AI
								</Badge>
							</div>
							<p className="text-muted-foreground mb-6 leading-relaxed">
								The future of learning is here. Transform your study habits with AI-powered tools
								that adapt to your unique learning style.
							</p>
							<div className="flex items-center gap-4">
								<Link
									href="#"
									className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors group"
								>
									<Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
								</Link>
								<Link
									href="#"
									className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors group"
								>
									<Linkedin className="w-4 h-4 group-hover:scale-110 transition-transform" />
								</Link>
								<Link
									href="#"
									className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors group"
								>
									<Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
								</Link>
							</div>
						</div>

						{/* Learning Tools */}
						<div>
							<h3 className="font-semibold mb-4 flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-primary" />
								Learning Tools
							</h3>
							<ul className="space-y-3">
								<li>
									<Link
										href="/dashboard/adaptive-learning/quizzes"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Smart Quizzes
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/adaptive-learning/flashcards"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Smart Flashcards
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/course-planner"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Course Planner
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/adaptive-learning/multiple-choice"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Multiple Choice
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/adaptive-learning/open-questions"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Open Questions
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
							</ul>
						</div>

						{/* Resources & Support */}
						<div>
							<h3 className="font-semibold mb-4 flex items-center gap-2">
								<GraduationCap className="w-4 h-4 text-primary" />
								Resources & Support
							</h3>
							<ul className="space-y-3">
								<li>
									<Link
										href="/dashboard/course-materials/files"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Course Materials
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/course-materials/notes"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Study Notes
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/ask-ai"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Ask AI
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/dashboard/feedback"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Feedback
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
							</ul>
						</div>

						{/* Legal & Blog */}
						<div>
							<h3 className="font-semibold mb-4 flex items-center gap-2">
								<FileText className="w-4 h-4 text-primary" />
								Legal & Blog
							</h3>
							<ul className="space-y-3">
								<li>
									<Link
										href="/legal/terms-of-service"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Terms of Service
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/legal/privacy-policy"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Privacy Policy
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/legal/cookie-policy"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Cookie Policy
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
								<li>
									<Link
										href="/blog"
										className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
									>
										Blog
										<ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Newsletter Section */}
				<div className="border-t py-8">
					<div className="max-w-2xl mx-auto text-center">
						<h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
							<Mail className="w-4 h-4 text-primary" />
							Stay Updated
						</h3>
						<p className="text-muted-foreground mb-6 text-sm">
							Get weekly study tips, AI insights, and exclusive offers for students.
						</p>
						<div className="space-y-3">
							<div className="flex gap-2 max-w-md mx-auto">
								<Input type="email" placeholder="Enter your email" className="flex-1" />
								<Button size="sm" className="px-3">
									<ArrowRight className="w-4 h-4" />
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">Join 100+ students already subscribed</p>
						</div>
					</div>
				</div>

				{/* Bottom Section */}
				<div className="border-t py-6">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span>© {new Date().getFullYear()} StudyLoop. All rights reserved.</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Powered by</span>
							<div className="flex items-center gap-1">
								<Zap className="w-3 h-3 text-primary" />
								<span className="font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
									Advanced AI
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
