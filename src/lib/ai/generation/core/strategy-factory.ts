/**
 * Strategy factory for content generation strategies
 */

import type {
	ConfigMap,
	ContentStrategy,
	OutputMap,
	SupportedContentType,
} from "../types";

// Strategy registry - using Record with specific function type
const strategies: Record<string, () => ContentStrategy<unknown, unknown>> = {};

/**
 * Register a strategy for a content type
 */
export function registerStrategy<T extends SupportedContentType>(
	contentType: T,
	strategyFactory: () => ContentStrategy<ConfigMap[T], OutputMap[T]>
): void {
	// @ts-expect-error - Type registry compatibility issue
	strategies[contentType] = strategyFactory;
}

/**
 * Get a strategy for a content type
 */
export function getStrategy<T extends SupportedContentType>(
	contentType: T
): ContentStrategy<ConfigMap[T], OutputMap[T]> {
	const strategyFactory = strategies[contentType];

	if (!strategyFactory) {
		throw new Error(`No strategy registered for content type: ${contentType}`);
	}

	// @ts-expect-error - Type registry compatibility issue
	return strategyFactory();
}

/**
 * Check if a strategy is registered for a content type
 */
export function hasStrategy(contentType: SupportedContentType): boolean {
	return contentType in strategies;
}

/**
 * Get all registered content types
 */
export function getRegisteredContentTypes(): SupportedContentType[] {
	return Object.keys(strategies) as SupportedContentType[];
}

/**
 * Base strategy creation helper
 */
export function createBaseStrategy<TConfig, TOutput>(
	config: Omit<ContentStrategy<TConfig, TOutput>, "contentType">
): Omit<ContentStrategy<TConfig, TOutput>, "contentType"> {
	return config;
}
