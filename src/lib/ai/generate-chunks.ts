/**
 * AI SDK native text chunking utility - as documented in their RAG examples
 * Simple, reliable chunking based on sentence boundaries
 */
export const generateChunks = (input: string): string[] => {
	return input
		.trim()
		.split(".")
		.filter((i) => i !== "" && i.trim().length > 0)
		.map((chunk) => chunk.trim());
};
