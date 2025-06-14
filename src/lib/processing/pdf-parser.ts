import pdfParse from "pdf-parse";

/**
 * PDF Parser for StudyLoop AI
 * Handles PDF text extraction with robust error recovery
 */

export interface PDFParseResult {
  text: string;
  metadata: {
    pages: number;
    info?: Record<string, unknown>;
    pageTexts?: string[];
    totalChars: number;
    extractedAt: string;
  };
  success: boolean;
  error?: string;
}

export interface PDFParseOptions {
  maxPages?: number;
  preservePageBreaks?: boolean;
  cleanText?: boolean;
  extractPagewise?: boolean;
}

/**
 * Parse PDF buffer and extract text content
 */
export async function parsePDF(
  buffer: Buffer,
  options: PDFParseOptions = {}
): Promise<PDFParseResult> {
  const {
    maxPages,
    preservePageBreaks = true,
    cleanText = true,
    extractPagewise = false,
  } = options;

  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty or invalid PDF buffer");
    }

    // Check if buffer starts with PDF header
    const pdfHeader = buffer.subarray(0, 4).toString();
    if (pdfHeader !== "%PDF") {
      throw new Error("Invalid PDF format - missing PDF header");
    }

    // Parse PDF
    const data = await pdfParse(buffer, {
      max: maxPages,
      version: "v1.10.100", // Specify pdf2pic version for consistency
    });

    if (!data || !data.text) {
      throw new Error("No text content extracted from PDF");
    }

    let extractedText = data.text;
    let pageTexts: string[] | undefined;

    // Clean text if requested
    if (cleanText) {
      extractedText = cleanPDFText(extractedText);
    }

    // Extract page-wise text if requested
    if (extractPagewise) {
      pageTexts = await extractPagewiseText(buffer, maxPages);
      if (cleanText && pageTexts) {
        pageTexts = pageTexts.map(cleanPDFText);
      }
    }

    // Preserve page breaks if requested
    if (preservePageBreaks) {
      extractedText = preservePageBreaks
        ? extractedText
        : extractedText.replace(/\f/g, "\n\n");
    }

    return {
      text: extractedText,
      metadata: {
        pages: data.numpages || 0,
        info: data.info || {},
        pageTexts,
        totalChars: extractedText.length,
        extractedAt: new Date().toISOString(),
      },
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown PDF parsing error";

    // Log error for debugging
    console.error("PDF parsing failed:", {
      error: errorMessage,
      bufferSize: buffer?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return {
      text: "",
      metadata: {
        pages: 0,
        totalChars: 0,
        extractedAt: new Date().toISOString(),
      },
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Clean extracted PDF text
 */
function cleanPDFText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, " ")
      // Remove page form feeds
      .replace(/\f/g, "\n\n")
      // Remove multiple consecutive line breaks
      .replace(/\n{3,}/g, "\n\n")
      // Remove leading/trailing whitespace
      .trim()
      // Remove special PDF characters that don't add value
      .split("")
      .filter((char) => {
        const code = char.charCodeAt(0);
        return !(code >= 0 && code <= 31) && !(code >= 127 && code <= 159);
      })
      .join("")
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
  );
}

/**
 * Extract text from each page separately
 */
async function extractPagewiseText(
  buffer: Buffer,
  maxPages?: number
): Promise<string[]> {
  try {
    // For page-wise extraction, we would need a more sophisticated approach
    // This is a simplified version that splits on form feed characters
    const fullText = await pdfParse(buffer, { max: maxPages });

    if (!fullText.text) return [];

    // Split by form feed character (page break)
    const pages = fullText.text.split("\f");

    return pages.filter((page) => page.trim().length > 0);
  } catch (error) {
    console.error("Page-wise extraction failed:", error);
    return [];
  }
}

/**
 * Validate PDF file before processing
 */
export function validatePDFBuffer(buffer: Buffer): {
  isValid: boolean;
  error?: string;
  metadata?: {
    size: number;
    hasValidHeader: boolean;
  };
} {
  try {
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        error: "Empty buffer provided",
      };
    }

    // Check minimum file size (PDF header + minimal content)
    if (buffer.length < 100) {
      return {
        isValid: false,
        error: "File too small to be a valid PDF",
        metadata: {
          size: buffer.length,
          hasValidHeader: false,
        },
      };
    }

    // Check PDF header
    const header = buffer.subarray(0, 4).toString();
    const hasValidHeader = header === "%PDF";

    if (!hasValidHeader) {
      return {
        isValid: false,
        error: "Invalid PDF header",
        metadata: {
          size: buffer.length,
          hasValidHeader: false,
        },
      };
    }

    // Check for PDF trailer
    const lastBytes = buffer.subarray(-100).toString();
    const hasTrailer = lastBytes.includes("%%EOF");

    if (!hasTrailer) {
      return {
        isValid: false,
        error: "Invalid PDF structure - missing EOF marker",
        metadata: {
          size: buffer.length,
          hasValidHeader: true,
        },
      };
    }

    return {
      isValid: true,
      metadata: {
        size: buffer.length,
        hasValidHeader: true,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Get PDF text preview (first N characters)
 */
export async function getPDFPreview(
  buffer: Buffer,
  maxChars = 500
): Promise<string> {
  try {
    const result = await parsePDF(buffer, {
      maxPages: 1,
      cleanText: true,
    });

    if (!result.success || !result.text) {
      return "Preview not available";
    }

    return (
      result.text.substring(0, maxChars) +
      (result.text.length > maxChars ? "..." : "")
    );
  } catch (error) {
    console.error("PDF preview generation failed:", error);
    return "Preview not available";
  }
}
