"use client";

import {
	PromptInput,
	PromptInputButton,
	PromptInputSubmit,
	PromptInputToolbar,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { PromptInputContentEditable } from "@/components/chat/prompt-input-content-editable";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { useUserCourses } from "@/hooks/use-courses";
import { BookOpen, GlobeIcon, MicIcon, X } from "lucide-react";
import {
	type FormEvent,
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebounceValue, useOnClickOutside } from "usehooks-ts";

interface Course {
	id: string;
	name: string;
}

interface ChatSession {
	id: string;
	title: string | null;
	courseIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

interface EnhancedPromptInputProps {
	onSubmit: (data: { message: string; courseIds: string[] }) => void;
	onSessionSelect?: (sessionId: string) => void;
	isLoading?: boolean;
	placeholder?: string;
}

export const EnhancedPromptInput = ({
	onSubmit,
	onSessionSelect,
	isLoading = false,
}: EnhancedPromptInputProps) => {
	// Dropdown visibility
	const [showDropdown, setShowDropdown] = useState(false);
	const [dropdownType, setDropdownType] = useState<"course" | "session" | null>(
		null
	);

	// Search queries
	const [searchQuery, setSearchQuery] = useState("");

	// Selected items
	const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Track if input has content for submit button state
	const [hasContent, setHasContent] = useState(false);

	// Refs
	const textareaRef = useRef<HTMLDivElement>(null); // Changed to div for contentEditable
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Get course data
	const { data: userCourses = [], isLoading: coursesLoading } =
		useUserCourses();

	// Get chat sessions data
	const { data: chatSessions = [], isLoading: sessionsLoading } =
		useChatSessions();

	// Sync selected courses based on contentEditable DOM chips
	const syncSelectedCoursesFromDOM = useCallback(
		(element: HTMLElement | null) => {
			if (!element || !userCourses.length) return;

			// Find all course chips in the contentEditable element
			const courseChips = element.querySelectorAll("[data-course-id]");
			const coursesInDOM: Course[] = [];

			for (const chip of Array.from(courseChips)) {
				const courseId = chip.getAttribute("data-course-id");
				if (courseId) {
					const course = userCourses.find((c) => c.id === courseId);
					if (course) {
						coursesInDOM.push(course);
					}
				}
			}

			// Update selectedCourses only if it's actually different (avoid infinite loops)
			setSelectedCourses((currentSelectedCourses) => {
				const currentCourseIds = currentSelectedCourses.map((c) => c.id).sort();
				const newCourseIds = coursesInDOM.map((c) => c.id).sort();

				// Only update if the courses are actually different
				if (JSON.stringify(currentCourseIds) === JSON.stringify(newCourseIds)) {
					return currentSelectedCourses; // Return same reference to prevent re-render
				}

				return coursesInDOM;
			});
		},
		[userCourses]
	);

	// Debounced search
	const [debouncedQuery] = useDebounceValue(searchQuery, 200);

	// Effect to sync selected courses when DOM changes
	useEffect(() => {
		if (textareaRef.current) {
			syncSelectedCoursesFromDOM(textareaRef.current);
		}
	}, [syncSelectedCoursesFromDOM]);

	// Format timestamp for display
	const formatTimestamp = (date: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffHours / 24);

		if (diffHours < 1) return "Just now";
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	};

	// Filter items based on dropdown type
	const dropdownItems =
		dropdownType === "course"
			? userCourses
					.filter((course) =>
						course.name.toLowerCase().includes(debouncedQuery.toLowerCase())
					)
					.slice(0, 8)
					.map((course) => ({
						id: course.id,
						label: course.name,
						subtitle: "Course",
						data: course,
					}))
			: chatSessions
					.filter((session) =>
						session.title?.toLowerCase().includes(debouncedQuery.toLowerCase())
					)
					.slice(0, 8)
					.map((session) => ({
						id: session.id,
						label: session.title || "Untitled Chat",
						subtitle: formatTimestamp(new Date(session.updatedAt)),
						data: session,
					}));

	// Handle input changes for contentEditable - detect triggers
	const handleContentChange = useCallback(() => {
		if (!textareaRef.current) return;

		const element = textareaRef.current;
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		// Get cursor position
		const range = selection.getRangeAt(0);

		// Create a temporary range to get text before cursor
		const tempRange = document.createRange();
		tempRange.selectNodeContents(element);
		tempRange.setEnd(range.endContainer, range.endOffset);
		const textBeforeCursor = tempRange.toString();

		// Check for triggers
		const lastSlash = textBeforeCursor.lastIndexOf("/");
		const lastAt = textBeforeCursor.lastIndexOf("@");

		// Determine active trigger
		if (lastSlash > -1 && lastSlash > lastAt) {
			const query = textBeforeCursor.substring(lastSlash + 1);
			if (query.includes(" ")) {
				setShowDropdown(false);
			} else {
				setDropdownType("course");
				setSearchQuery(query);
				setShowDropdown(true);
				setSelectedIndex(0);
			}
		} else if (lastAt > -1) {
			const query = textBeforeCursor.substring(lastAt + 1);
			if (query.includes(" ")) {
				setShowDropdown(false);
			} else {
				setDropdownType("session");
				setSearchQuery(query);
				setShowDropdown(true);
				setSelectedIndex(0);
			}
		} else {
			setShowDropdown(false);
		}

		// Sync selected courses from DOM badges
		syncSelectedCoursesFromDOM(element);

		// Update hasContent state for submit button
		const cleanText = extractCleanTextContent();
		setHasContent(!!cleanText.trim());
	}, [syncSelectedCoursesFromDOM]);

	// Handle item selection
	const selectItem = useCallback(
		(item: (typeof dropdownItems)[0]) => {
			if (dropdownType === "course") {
				const course = item.data as Course;

				// Insert course chip into contentEditable element
				if (textareaRef.current) {
					const element = textareaRef.current;
					const selection = window.getSelection();

					if (selection && selection.rangeCount > 0) {
						const triggerText = `/${searchQuery}`;

						// Find the trigger text in the DOM nodes (preserving existing chips)
						const walker = document.createTreeWalker(
							element,
							NodeFilter.SHOW_TEXT,
							null
						);

						let textNode: Text | null = null;
						let triggerIndex = -1;

						// Walk through text nodes to find the trigger
						while (walker.nextNode()) {
							const node = walker.currentNode as Text;
							const nodeText = node.textContent || "";
							const index = nodeText.lastIndexOf(triggerText);

							if (index !== -1) {
								textNode = node;
								triggerIndex = index;
								break;
							}
						}

						if (
							textNode &&
							triggerIndex !== -1 &&
							textNode.textContent &&
							textNode.parentNode
						) {
							const originalText = textNode.textContent;
							const beforeText = originalText.substring(0, triggerIndex);
							const afterText = originalText.substring(
								triggerIndex + triggerText.length
							);
							const parentNode = textNode.parentNode;
							const nextSibling = textNode.nextSibling;

							// Create course chip element (matching existing chip style)
							const courseChip = document.createElement("span");
							courseChip.className =
								"inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mx-1";
							courseChip.setAttribute("data-course-id", course.id);
							courseChip.setAttribute("contenteditable", "false");
							courseChip.textContent = course.name;

							// Remove the original text node
							parentNode.removeChild(textNode);

							// Insert before text if it exists
							if (beforeText.trim()) {
								const beforeTextNode = document.createTextNode(beforeText);
								parentNode.insertBefore(beforeTextNode, nextSibling);
							}

							// Insert course chip
							parentNode.insertBefore(courseChip, nextSibling);

							// Insert after text if it exists
							if (afterText) {
								const afterTextNode = document.createTextNode(afterText);
								parentNode.insertBefore(afterTextNode, nextSibling);
							} else {
								// Add space for continued typing
								const spaceNode = document.createTextNode(" ");
								parentNode.insertBefore(spaceNode, nextSibling);
							}

							// Place cursor after the chip/space
							const range = document.createRange();
							const newSelection = window.getSelection();
							const lastInserted = nextSibling?.previousSibling || courseChip;
							range.setStartAfter(lastInserted);
							range.collapse(true);
							newSelection?.removeAllRanges();
							newSelection?.addRange(range);
						}
					}

					// Trigger content change to sync everything
					handleContentChange();
				}
			} else {
				// Session selected - load it
				const session = item.data as ChatSession;
				if (onSessionSelect) {
					onSessionSelect(session.id);
				}
				setHasContent(false);
				if (textareaRef.current) {
					textareaRef.current.innerHTML = "";
				}
			}

			setShowDropdown(false);
		},
		[dropdownType, searchQuery, onSessionSelect, handleContentChange]
	);

	// Remove selected course by removing its chip from contentEditable
	const removeCourse = useCallback(
		(courseId: string) => {
			if (textareaRef.current) {
				const element = textareaRef.current;
				const chip = element.querySelector(`[data-course-id="${courseId}"]`);

				if (chip) {
					chip.remove();
					// Trigger content change to sync everything
					handleContentChange();
				}
			}
		},
		[handleContentChange]
	);

	// Focus/blur handlers for contentEditable
	const handleContentFocus = useCallback(() => {
		// Contenteditable is focused
	}, []);

	const handleContentBlur = useCallback(() => {
		// Contenteditable lost focus
	}, []);

	// Custom onKeyDown handler for contentEditable
	const handleContentKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			// Handle backspace for chip deletion
			if (e.key === "Backspace") {
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					const container = range.startContainer;

					// Check if cursor is right after a chip
					if (
						range.collapsed &&
						range.startOffset === 0 &&
						container.previousSibling
					) {
						const prevElement = container.previousSibling;
						if (
							prevElement.nodeType === Node.ELEMENT_NODE &&
							(prevElement as Element).hasAttribute("data-course-id")
						) {
							e.preventDefault();
							prevElement.remove();
							handleContentChange();
							return;
						}
					}
				}
			}
		},
		[handleContentChange]
	);

	// Extract clean text content excluding course chips
	const extractCleanTextContent = useCallback(() => {
		if (!textareaRef.current) return "";

		const element = textareaRef.current;
		const clonedElement = element.cloneNode(true) as HTMLElement;

		// Remove all course chips (elements with data-course-id attribute)
		const courseChips = clonedElement.querySelectorAll("[data-course-id]");
		for (const chip of Array.from(courseChips)) {
			chip.remove();
		}

		return clonedElement.textContent?.trim() || "";
	}, []);

	// Handle form submission
	const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const cleanMessage = extractCleanTextContent();
		if (!cleanMessage.trim()) return;

		onSubmit({
			message: cleanMessage,
			courseIds: selectedCourses.map((c) => c.id),
		});

		// Clear the input after submission
		setSelectedCourses([]);
		setHasContent(false);
		if (textareaRef.current) {
			textareaRef.current.innerHTML = "";
		}
	};

	// Keyboard navigation - optimized with react-hotkeys-hook
	const hotkeyOptions = {
		enableOnContentEditable: true,
		enableOnFormTags: true,
		preventDefault: false,
	};

	useHotkeys(
		"down",
		(e) => {
			if (showDropdown && dropdownItems.length > 0) {
				e.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % dropdownItems.length);
			}
		},
		hotkeyOptions,
		[showDropdown, dropdownItems.length]
	);

	useHotkeys(
		"up",
		(e) => {
			if (showDropdown && dropdownItems.length > 0) {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev === 0 ? dropdownItems.length - 1 : prev - 1
				);
			}
		},
		hotkeyOptions,
		[showDropdown, dropdownItems.length]
	);

	useHotkeys(
		"enter",
		(e) => {
			if (showDropdown && dropdownItems[selectedIndex]) {
				e.preventDefault();
				selectItem(dropdownItems[selectedIndex]);
			}
		},
		hotkeyOptions,
		[showDropdown, dropdownItems, selectedIndex, selectItem]
	);

	useHotkeys(
		"escape",
		() => {
			if (showDropdown) {
				setShowDropdown(false);
			}
		},
		hotkeyOptions,
		[showDropdown]
	);

	// Click outside to close dropdown
	useOnClickOutside(
		[dropdownRef, textareaRef] as RefObject<HTMLElement>[],
		() => {
			setShowDropdown(false);
		}
	);

	return (
		<div className="relative">
			{/* Selected courses chips */}
			{selectedCourses.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-3">
					{selectedCourses.map((course) => (
						<div
							key={course.id}
							className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
						>
							<BookOpen className="h-3 w-3" />
							<span>{course.name}</span>
							<button
								type="button"
								onClick={() => removeCourse(course.id)}
								className="hover:bg-blue-200 rounded-full p-0.5"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Main input */}
			<PromptInput onSubmit={handleFormSubmit}>
				<PromptInputContentEditable
					ref={textareaRef}
					onInput={handleContentChange}
					onKeyDown={handleContentKeyDown}
					onFocus={handleContentFocus}
					onBlur={handleContentBlur}
					data-placeholder="Type '/' for courses, '@' for previous chats, or just ask a question..."
					aria-disabled={isLoading}
				/>

				<PromptInputToolbar>
					<PromptInputTools>
						<PromptInputButton>
							<MicIcon size={16} />
						</PromptInputButton>
						<PromptInputButton>
							<GlobeIcon size={16} />
							<span>Search</span>
						</PromptInputButton>
					</PromptInputTools>
					<PromptInputSubmit
						className="absolute right-1 bottom-1"
						disabled={isLoading || !hasContent}
						status={isLoading ? "submitted" : "ready"}
					/>
				</PromptInputToolbar>
			</PromptInput>

			{/* Dropdown */}
			{showDropdown && (
				<div className="absolute -top-2 left-0 right-0 z-50 transform -translate-y-full">
					<div
						ref={dropdownRef}
						className="bg-background/95 backdrop-blur-sm shadow-lg rounded-lg max-h-64 overflow-y-auto"
					>
						{/* Dropdown header */}
						<div className="px-3 py-2 border-b text-xs text-muted-foreground">
							{dropdownType === "course" ? (
								<span>Select a course to add context</span>
							) : (
								<span>Load a previous conversation</span>
							)}
						</div>

						{/* Dropdown items */}
						{(coursesLoading && dropdownType === "course") ||
						(sessionsLoading && dropdownType === "session") ? (
							<div className="px-4 py-3 text-sm text-muted-foreground">
								{dropdownType === "course"
									? "Loading courses..."
									: "Loading sessions..."}
							</div>
						) : dropdownItems.length === 0 ? (
							<div className="px-4 py-3 text-sm text-muted-foreground">
								No matches found
							</div>
						) : (
							dropdownItems.map((item, index) => (
								<button
									key={item.id}
									type="button"
									className={`w-full text-left px-4 py-3 hover:bg-muted/30 ${
										index === selectedIndex ? "bg-accent" : ""
									}`}
									onClick={() => selectItem(item)}
									onMouseEnter={() => setSelectedIndex(index)}
								>
									<div className="font-medium text-sm">{item.label}</div>
									<div className="text-xs text-muted-foreground">
										{item.subtitle}
									</div>
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
};
