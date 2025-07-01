"use client";

import { LoadingButton } from "@/components/loading-button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type CourseCreationData, CourseCreationSchema } from "@/lib/validations/courses";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface CourseCreationFormProps {
	onSubmit: (data: CourseCreationData) => void;
	isPending: boolean;
}

export function CourseCreationForm({ onSubmit, isPending }: CourseCreationFormProps) {
	const form = useForm<CourseCreationData>({
		resolver: zodResolver(CourseCreationSchema),
		defaultValues: {
			name: "",
			description: "",
			language: "english",
			durationWeeks: 12,
		},
	});

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Course Name</FormLabel>
							<FormControl>
								<Input placeholder="e.g., Introduction to Psychology" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description (Optional)</FormLabel>
							<FormControl>
								<Textarea placeholder="A brief summary of the course content." {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="language"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Language</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select a language" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="english">English</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="durationWeeks"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Duration (Weeks)</FormLabel>
								<FormControl>
									<Input
										type="number"
										{...field}
										onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10))}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<LoadingButton type="submit" loading={isPending} className="w-full">
					Create Course
				</LoadingButton>
			</form>
		</Form>
	);
}
