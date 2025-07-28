"use client";

import {
	type TableColumn,
	getVisibleColumns,
} from "@/components/course/table-column-config";
import { useEffect, useState } from "react";

export function useResponsiveColumns(columns: TableColumn[]) {
	const [screenSize, setScreenSize] = useState<"mobile" | "desktop" | "large">(
		"large"
	);
	const [visibleColumns, setVisibleColumns] = useState<TableColumn[]>(columns);

	useEffect(() => {
		const updateScreenSize = () => {
			const width = window.innerWidth;
			if (width < 640) {
				setScreenSize("mobile");
			} else if (width < 1024) {
				setScreenSize("desktop");
			} else {
				setScreenSize("large");
			}
		};

		updateScreenSize();
		window.addEventListener("resize", updateScreenSize);
		return () => window.removeEventListener("resize", updateScreenSize);
	}, []);

	useEffect(() => {
		setVisibleColumns(getVisibleColumns(columns, screenSize));
	}, [columns, screenSize]);

	return {
		screenSize,
		visibleColumns,
		isMobile: screenSize === "mobile",
		isDesktop: screenSize === "desktop",
		isLarge: screenSize === "large",
	};
}
