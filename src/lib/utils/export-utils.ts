"use client";

import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import Papa from "papaparse";

import type { GoldenNote, Summary } from "@/hooks/use-notes";

export type ExportType = "pdf" | "csv" | "json";

interface ExportData {
	goldenNotes: GoldenNote[];
	summaries: Summary[];
	courseName?: string;
	weekNumber?: number;
	materialTitle?: string;
}

// Export notes to PDF
export function exportToPDF(data: ExportData) {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 20;
	const maxLineWidth = pageWidth - margin * 2;
	let yPosition = margin;

	// Helper function to add text with word wrapping
	const addWrappedText = (text: string, fontSize = 12, isBold = false) => {
		doc.setFontSize(fontSize);
		if (isBold) {
			doc.setFont("helvetica", "bold");
		} else {
			doc.setFont("helvetica", "normal");
		}

		const lines = doc.splitTextToSize(text, maxLineWidth);
		for (const line of lines) {
			// Check if we need a new page
			if (yPosition > doc.internal.pageSize.getHeight() - margin) {
				doc.addPage();
				yPosition = margin;
			}
			doc.text(line, margin, yPosition);
			yPosition += fontSize * 0.5;
		}
		yPosition += 5; // Add some spacing after each block
	};

	// Add header
	addWrappedText(`Notes Export - ${data.courseName || "Course"}`, 16, true);
	if (data.weekNumber) {
		addWrappedText(`Week ${data.weekNumber}: ${data.materialTitle || ""}`, 14, true);
	}
	addWrappedText(`Exported on: ${new Date().toLocaleDateString()}`, 10);
	yPosition += 10;

	// Add Golden Notes
	if (data.goldenNotes.length > 0) {
		addWrappedText("Golden Notes", 14, true);
		yPosition += 5;

		for (const note of data.goldenNotes) {
			addWrappedText(note.title, 12, true);
			addWrappedText(note.content, 10);
			if (note.category) {
				addWrappedText(`Category: ${note.category}`, 9);
			}
			yPosition += 10;
		}
	}

	// Add Summaries
	if (data.summaries.length > 0) {
		addWrappedText("Summaries", 14, true);
		yPosition += 5;

		for (const summary of data.summaries) {
			addWrappedText(summary.title || "Summary", 12, true);
			addWrappedText(summary.content, 10);
			if (summary.summaryType) {
				addWrappedText(`Type: ${summary.summaryType}`, 9);
			}
			if (summary.wordCount) {
				addWrappedText(`Word Count: ${summary.wordCount}`, 9);
			}
			yPosition += 10;
		}
	}

	// Save the PDF
	const filename = `notes-${data.courseName?.toLowerCase().replace(/\s+/g, "-") || "export"}-${
		data.weekNumber || "all"
	}-${new Date().toISOString().split("T")[0]}.pdf`;
	doc.save(filename);
}

// Export notes to CSV
export function exportToCSV(data: ExportData) {
	const csvData: Array<Record<string, string | number | null>> = [];

	// Add Golden Notes
	for (const note of data.goldenNotes) {
		csvData.push({
			Type: "Golden Note",
			Title: note.title,
			Content: note.content,
			Category: note.category || "",
			Priority: note.priority || "",
			Created: note.createdAt.toISOString(),
			Updated: note.updatedAt.toISOString(),
		});
	}

	// Add Summaries
	for (const summary of data.summaries) {
		csvData.push({
			Type: "Summary",
			Title: summary.title || "Summary",
			Content: summary.content,
			Category: summary.summaryType || "",
			Priority: "",
			Created: summary.createdAt.toISOString(),
			Updated: summary.updatedAt.toISOString(),
			"Word Count": summary.wordCount || "",
		});
	}

	const csv = Papa.unparse(csvData);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const filename = `notes-${data.courseName?.toLowerCase().replace(/\s+/g, "-") || "export"}-${
		data.weekNumber || "all"
	}-${new Date().toISOString().split("T")[0]}.csv`;
	saveAs(blob, filename);
}

// Export notes to JSON
export function exportToJSON(data: ExportData) {
	const jsonData = {
		exportInfo: {
			courseName: data.courseName,
			weekNumber: data.weekNumber,
			materialTitle: data.materialTitle,
			exportDate: new Date().toISOString(),
			totalGoldenNotes: data.goldenNotes.length,
			totalSummaries: data.summaries.length,
		},
		goldenNotes: data.goldenNotes.map((note) => ({
			title: note.title,
			content: note.content,
			priority: note.priority,
			category: note.category,
			createdAt: note.createdAt.toISOString(),
			updatedAt: note.updatedAt.toISOString(),
		})),
		summaries: data.summaries.map((summary) => ({
			title: summary.title,
			content: summary.content,
			summaryType: summary.summaryType,
			wordCount: summary.wordCount,
			createdAt: summary.createdAt.toISOString(),
			updatedAt: summary.updatedAt.toISOString(),
		})),
	};

	const jsonString = JSON.stringify(jsonData, null, 2);
	const blob = new Blob([jsonString], {
		type: "application/json;charset=utf-8;",
	});
	const filename = `notes-${data.courseName?.toLowerCase().replace(/\s+/g, "-") || "export"}-${
		data.weekNumber || "all"
	}-${new Date().toISOString().split("T")[0]}.json`;
	saveAs(blob, filename);
}

// Main export function
export function exportNotes(type: ExportType, data: ExportData) {
	switch (type) {
		case "pdf":
			exportToPDF(data);
			break;
		case "csv":
			exportToCSV(data);
			break;
		case "json":
			exportToJSON(data);
			break;
		default:
			throw new Error(`Unsupported export type: ${type}`);
	}
}
