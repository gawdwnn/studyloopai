"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { updateCourse } from "@/lib/actions/courses";
import { logger } from "@/lib/utils/logger";
import type { Course } from "@/types/database-types";
import { Edit2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface CourseCardProps {
	course: Course;
	onDeleteCourse?: (courseId: string, courseName: string) => void;
	isDeleting?: boolean;
	isBeingDeleted?: boolean;
}

export function CourseCard({
	course,
	onDeleteCourse,
	isDeleting = false,
	isBeingDeleted = false,
}: CourseCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [title, setTitle] = useState(course.name);
	const [isHovered, setIsHovered] = useState(false);
	const [isPending, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleEdit = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsEditing(true);
	};

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isEditing]);

	const handleConfirmDelete = async () => {
		if (onDeleteCourse) {
			onDeleteCourse(course.id, course.name);
		}
	};

	const handleSave = async () => {
		if (title.trim() !== course.name && title.trim() !== "") {
			startTransition(async () => {
				try {
					await updateCourse(course.id, { name: title.trim() });
				} catch (error) {
					logger.error(
						{
							err: error,
							courseId: course.id,
							originalName: course.name,
							newName: title.trim(),
						},
						"Failed to update course name"
					);
					alert("Failed to update course. Please try again.");
					setTitle(course.name);
				}
			});
		}
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSave();
		}
		if (e.key === "Escape") {
			setIsEditing(false);
			setTitle(course.name);
		}
	};

	const handleBlur = () => {
		handleSave();
	};

	return (
		<div className="block h-full">
			<div
				className={`relative h-full transition-all duration-300 ${
					isBeingDeleted ? "opacity-50 scale-95" : ""
				}`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<Card
					className={`w-full h-full border-0 shadow-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col ${
						isBeingDeleted ? "bg-destructive/5 border-destructive/20" : ""
					}`}
				>
					<div
						className="absolute top-0 right-0 w-6 h-6 bg-muted-foreground/20"
						style={{
							clipPath: "polygon(0 0, 100% 100%, 0 100%)",
						}}
					/>
					<div
						className="absolute bottom-0 right-0 w-6 h-6 bg-muted-foreground/20"
						style={{
							clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
						}}
					/>

					<CardHeader className="pb-2">
						<CardTitle className="text-lg leading-6 h-12 flex items-center">
							{isEditing ? (
								<input
									ref={inputRef}
									type="text"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									onKeyDown={handleKeyDown}
									onBlur={handleBlur}
									className="w-full bg-transparent border-b-2 border-primary/20 focus:border-primary transition-colors duration-300 px-2 py-1 outline-none"
									onClick={(e) => e.stopPropagation()}
								/>
							) : (
								<span className="truncate block">{title}</span>
							)}
						</CardTitle>
					</CardHeader>

					<CardContent className="pt-0 flex-1 flex flex-col justify-end">
						<div className="flex items-center justify-between">
							<div className="flex-1 mr-4">
								<Progress value={30} className="h-2" />
							</div>

							<div className="flex flex-col items-end text-sm text-muted-foreground">
								{/* TODO: add important dates */}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Edit/Delete buttons or deletion indicator */}
				{isBeingDeleted ? (
					<div className="absolute top-2 right-6 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-md p-2 z-10">
						<div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
						<span className="text-sm text-destructive font-medium">
							Deleting...
						</span>
					</div>
				) : isHovered && !isEditing ? (
					<div className="absolute top-2 right-6 flex gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 z-10">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleEdit}
							disabled={isPending || isDeleting || isBeingDeleted}
							className="h-8 w-8 p-0"
						>
							<Edit2 className="h-4 w-4" />
						</Button>
						<ConfirmDialog
							trigger={
								<Button
									variant="ghost"
									size="sm"
									disabled={isPending || isDeleting || isBeingDeleted}
									className="h-8 w-8 p-0"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							}
							title="Delete Course"
							description={`Are you sure you want to delete "${course.name}"? This action cannot be undone and will permanently remove the course and all its materials and learning features.`}
							confirmText="Delete Course"
							variant="destructive"
							onConfirm={handleConfirmDelete}
							isLoading={isPending || isDeleting}
							disabled={isPending || isDeleting || isBeingDeleted}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}
