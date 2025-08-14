import type { InferUITools, UIMessage, UIMessageStreamWriter } from "ai";
import type { DataPart } from "../messages/data-parts";
import { browseWebsite } from "./browse-website";
import { createGetCourseMaterial } from "./course-material";
import { enhancedWebSearch } from "./enhanced-web-search";
import { webSearch } from "./web-search";

interface Params {
	courseIds?: string[];
	writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
}

/**
 * Compose chat tools based on context
 * Returns appropriate tools for the given parameters
 */
export function tools({ courseIds, writer }: Params) {
	return {
		webSearch: webSearch({ writer }),
		enhancedWebSearch: enhancedWebSearch({ writer }),
		browseWebsite: browseWebsite({ writer }),
		...(courseIds?.length && {
			getCourseMaterial: createGetCourseMaterial({ writer, courseIds }),
		}),
	};
}

export type ToolSet = InferUITools<ReturnType<typeof tools>>;
