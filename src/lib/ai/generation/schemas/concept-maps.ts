/**
 * Concept Maps schema and types
 */

import { z } from "zod";

// Node schema
export const NodeSchema = z.object({
	id: z.string().min(1, "Node ID is required"),
	label: z.string().min(1, "Node label is required"),
	type: z.enum(["concept", "topic", "subtopic", "example"]),
	level: z.number().int().min(0).max(5),
	x: z.number().optional(),
	y: z.number().optional(),
});

// Edge schema
export const EdgeSchema = z.object({
	source: z.string().min(1, "Source node ID is required"),
	target: z.string().min(1, "Target node ID is required"),
	label: z.string().optional(),
	type: z.enum(["related", "causes", "leads_to", "part_of", "example_of"]),
	strength: z.number().min(0).max(1).optional(),
});

// Metadata schema
export const MetadataSchema = z.object({
	central_concept: z.string().min(1, "Central concept is required"),
	complexity_level: z.enum(["beginner", "intermediate", "advanced"]),
	focus_area: z.enum(["conceptual", "practical", "mixed"]),
	style: z.enum(["hierarchical", "radial", "network"]),
});

// Concept map content schema
export const ConceptMapContentSchema = z.object({
	nodes: z.array(NodeSchema).min(1, "At least one node is required"),
	edges: z.array(EdgeSchema),
	metadata: MetadataSchema,
});

// Concept map schema
export const ConceptMapSchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: ConceptMapContentSchema,
	style: z.enum(["hierarchical", "radial", "network"]),
});

// Concept maps array schema
export const ConceptMapsArraySchema = z.array(ConceptMapSchema);

// Concept maps object schema (for generateObject)
export const ConceptMapsObjectSchema = z.object({
	conceptMaps: z.array(ConceptMapSchema),
});

// Type definitions
export type ConceptMapNode = z.infer<typeof NodeSchema>;
export type ConceptMapEdge = z.infer<typeof EdgeSchema>;
export type ConceptMapMetadata = z.infer<typeof MetadataSchema>;
export type ConceptMapContent = z.infer<typeof ConceptMapContentSchema>;
export type ConceptMap = z.infer<typeof ConceptMapSchema>;
export type ConceptMapsArray = z.infer<typeof ConceptMapsArraySchema>;
export type ConceptMapsObject = z.infer<typeof ConceptMapsObjectSchema>;
