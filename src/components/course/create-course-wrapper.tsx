"use client";

import { CreateCourseDialog } from "@/components/course/create-course-dialog";
import { useQueryState } from "@/hooks/use-query-state";
import { useEffect, useState } from "react";

export function CreateCourseWrapper() {
	const [isOpen, setIsOpen] = useState(false);
	const { searchParams, setQueryState } = useQueryState();

	useEffect(() => {
		const action = searchParams.get("action");
		if (action === "create") {
			setIsOpen(true);
			setQueryState({ action: null });
		}
	}, [searchParams, setQueryState]);

	return <CreateCourseDialog isOpen={isOpen} onOpenChange={setIsOpen} />;
}
