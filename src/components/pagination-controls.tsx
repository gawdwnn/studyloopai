import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlsProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function PaginationControls({
	currentPage,
	totalPages,
	onPageChange,
}: PaginationControlsProps) {
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						onClick={() => onPageChange(Math.max(1, currentPage - 1))}
						aria-disabled={currentPage === 1}
						className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
				<PaginationItem>
					<span className="text-sm font-medium p-2">
						Page {currentPage} of {totalPages}
					</span>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
						aria-disabled={currentPage === totalPages}
						className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
