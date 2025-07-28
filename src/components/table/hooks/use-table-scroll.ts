"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTableScrollOptions {
	scrollAmount?: number;
	useColumnWidths?: boolean;
	startFromColumn?: number;
}

interface UseTableScrollReturn {
	containerRef: React.RefObject<HTMLDivElement | null>;
	canScrollLeft: boolean;
	canScrollRight: boolean;
	isScrollable: boolean;
	scrollLeft: () => void;
	scrollRight: () => void;
	scrollToStart: () => void;
	scrollToEnd: () => void;
}

export function useTableScroll(
	options: UseTableScrollOptions = {}
): UseTableScrollReturn {
	const {
		scrollAmount = 120,
		useColumnWidths = false,
		startFromColumn = 0,
	} = options;

	const containerRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [isScrollable, setIsScrollable] = useState(false);
	const [currentColumnIndex, setCurrentColumnIndex] = useState(startFromColumn);

	// Update scroll state based on current scroll position
	const updateScrollState = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		const { scrollLeft, scrollWidth, clientWidth } = container;
		const maxScrollLeft = scrollWidth - clientWidth;

		setCanScrollLeft(scrollLeft > 0);
		setCanScrollRight(scrollLeft < maxScrollLeft);
		setIsScrollable(scrollWidth > clientWidth);
	}, []);

	// Get column widths for column-based scrolling
	const getColumnWidths = useCallback(() => {
		const container = containerRef.current;
		if (!container) return [];

		const table = container.querySelector("table");
		if (!table) return [];

		const headerCells = table.querySelectorAll("thead th");
		return Array.from(headerCells).map(
			(cell) => cell.getBoundingClientRect().width
		);
	}, []);

	// Calculate scroll amount based on column widths or fixed amount
	const calculateScrollAmount = useCallback(
		(direction: "left" | "right") => {
			if (!useColumnWidths) return scrollAmount;

			const columnWidths = getColumnWidths();
			if (columnWidths.length === 0) return scrollAmount;

			if (direction === "right") {
				const nextIndex = Math.min(
					currentColumnIndex + 1,
					columnWidths.length - 1
				);
				setCurrentColumnIndex(nextIndex);
				return columnWidths[currentColumnIndex] || scrollAmount;
			}
			const prevIndex = Math.max(currentColumnIndex - 1, 0);
			setCurrentColumnIndex(prevIndex);
			return columnWidths[prevIndex] || scrollAmount;
		},
		[useColumnWidths, scrollAmount, currentColumnIndex, getColumnWidths]
	);

	// Scroll left function
	const scrollLeft = useCallback(() => {
		const container = containerRef.current;
		if (!container || !canScrollLeft) return;

		const amount = calculateScrollAmount("left");
		container.scrollBy({
			left: -amount,
			behavior: "smooth",
		});
	}, [canScrollLeft, calculateScrollAmount]);

	// Scroll right function
	const scrollRight = useCallback(() => {
		const container = containerRef.current;
		if (!container || !canScrollRight) return;

		const amount = calculateScrollAmount("right");
		container.scrollBy({
			left: amount,
			behavior: "smooth",
		});
	}, [canScrollRight, calculateScrollAmount]);

	// Scroll to start
	const scrollToStart = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		container.scrollTo({
			left: 0,
			behavior: "smooth",
		});
		setCurrentColumnIndex(0);
	}, []);

	// Scroll to end
	const scrollToEnd = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		container.scrollTo({
			left: container.scrollWidth,
			behavior: "smooth",
		});
		const columnWidths = getColumnWidths();
		setCurrentColumnIndex(Math.max(columnWidths.length - 1, 0));
	}, [getColumnWidths]);

	// Set up scroll event listener and touch gestures
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			updateScrollState();
		};

		// Touch gesture support
		let startX = 0;
		let startY = 0;
		let isSwipeGesture = false;

		const handleTouchStart = (e: TouchEvent) => {
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
			isSwipeGesture = false;
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches.length > 1) return; // Multi-touch, ignore

			const currentX = e.touches[0].clientX;
			const currentY = e.touches[0].clientY;
			const deltaX = Math.abs(currentX - startX);
			const deltaY = Math.abs(currentY - startY);

			// Detect horizontal swipe (more horizontal than vertical movement)
			if (deltaX > deltaY && deltaX > 10) {
				isSwipeGesture = true;
				e.preventDefault(); // Prevent page scroll during horizontal swipe
			}
		};

		const handleTouchEnd = (e: TouchEvent) => {
			if (!isSwipeGesture) return;

			const endX = e.changedTouches[0].clientX;
			const deltaX = startX - endX;
			const threshold = 50; // Minimum swipe distance

			if (Math.abs(deltaX) > threshold) {
				if (deltaX > 0 && canScrollRight) {
					// Swipe left = scroll right
					scrollRight();
				} else if (deltaX < 0 && canScrollLeft) {
					// Swipe right = scroll left
					scrollLeft();
				}
			}
		};

		container.addEventListener("scroll", handleScroll, { passive: true });
		container.addEventListener("touchstart", handleTouchStart, {
			passive: true,
		});
		container.addEventListener("touchmove", handleTouchMove, {
			passive: false,
		});
		container.addEventListener("touchend", handleTouchEnd, { passive: true });

		return () => {
			container.removeEventListener("scroll", handleScroll);
			container.removeEventListener("touchstart", handleTouchStart);
			container.removeEventListener("touchmove", handleTouchMove);
			container.removeEventListener("touchend", handleTouchEnd);
		};
	}, [
		updateScrollState,
		canScrollLeft,
		canScrollRight,
		scrollLeft,
		scrollRight,
	]);

	// Set up resize observer to handle dynamic content changes
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			updateScrollState();
		});

		resizeObserver.observe(container);

		// Also observe the table if it exists
		const table = container.querySelector("table");
		if (table) {
			resizeObserver.observe(table);
		}

		return () => {
			resizeObserver.disconnect();
		};
	}, [updateScrollState]);

	// Initial scroll state update
	useEffect(() => {
		const timer = setTimeout(updateScrollState, 100);
		return () => clearTimeout(timer);
	}, [updateScrollState]);

	return {
		containerRef,
		canScrollLeft,
		canScrollRight,
		isScrollable,
		scrollLeft,
		scrollRight,
		scrollToStart,
		scrollToEnd,
	};
}
