import type { ProcessingResult } from "../types";

export interface ProcessorStrategy {
	name: string;
	canProcess: (buffer: Buffer, mimeType: string) => boolean;
	process: (buffer: Buffer) => Promise<ProcessingResult>;
}

export const createProcessingResult = ({
	success,
	text,
	error,
	source,
}: ProcessingResult): ProcessingResult => {
	return {
		success,
		text,
		error,
		source,
	};
};

export const createMimeTypeCanProcess = (supportedTypes: readonly string[]) => {
	return (_: Buffer, mimeType: string): boolean =>
		supportedTypes.some((type) => mimeType.includes(type));
};
