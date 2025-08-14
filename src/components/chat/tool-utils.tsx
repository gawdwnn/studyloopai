"use client";

import type { ToolUIPart } from "ai";

// Helper function to get human-readable tool display names
export const getToolDisplayName = (toolName: string): string => {
	const toolNames: Record<string, string> = {
		getCourseMaterial: "Course Material Search",
		webSearch: "Web Search",
		enhancedWebSearch: "Enhanced Web Search",
		browseWebsite: "Website Browser",
	};
	return toolNames[toolName] || toolName;
};

// Helper function to extract tool name from ToolUIPart type
export const extractToolName = (toolType: ToolUIPart["type"]): string => {
	return toolType.replace("tool-", "");
};
