export interface TableColumn {
	id: string;
	label: string;
	priority: "always" | "desktop" | "large";
	className?: string;
	headerClassName?: string;
	sortable?: boolean;
}

export const COURSE_MATERIAL_COLUMNS: TableColumn[] = [
	{
		id: "week",
		label: "Week",
		priority: "desktop",
		className: "w-20 text-center whitespace-nowrap",
		headerClassName: "w-20 whitespace-nowrap",
	},
	{
		id: "courseName",
		label: "Course Name",
		priority: "desktop",
		className: "min-w-[150px] whitespace-nowrap",
		headerClassName: "min-w-[150px] whitespace-nowrap",
	},
	{
		id: "materialName",
		label: "Material Name",
		priority: "always",
		className: "min-w-[200px] whitespace-nowrap",
		headerClassName: "min-w-[200px] whitespace-nowrap",
	},
	{
		id: "status",
		label: "Status",
		priority: "always",
		className: "w-40 whitespace-nowrap",
		headerClassName: "w-40 whitespace-nowrap",
	},
	{
		id: "notes",
		label: "Notes",
		priority: "large",
		className: "w-16 text-center whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap text-center",
	},
	{
		id: "summaries",
		label: "Summaries",
		priority: "large",
		className: "w-16 text-center whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap text-center",
	},
	{
		id: "cuecards",
		label: "Cuecards",
		priority: "large",
		className: "w-16 text-center whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap text-center",
	},
	{
		id: "mcqs",
		label: "MCQs",
		priority: "large",
		className: "w-16 text-center whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap text-center",
	},
	{
		id: "openQuestions",
		label: "Open Questions",
		priority: "large",
		className: "w-16 text-center whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap text-center",
	},
	{
		id: "conceptMaps",
		label: "Concept Maps",
		priority: "large",
		className: "w-16 text-center whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap text-center",
	},
	{
		id: "actions",
		label: "",
		priority: "always",
		className: "w-16 whitespace-nowrap",
		headerClassName: "w-16 whitespace-nowrap",
	},
];

export function getVisibleColumns(
	columns: TableColumn[],
	screenSize: "mobile" | "desktop" | "large"
): TableColumn[] {
	switch (screenSize) {
		case "mobile":
			return columns.filter((col) => col.priority === "always");
		case "desktop":
			return columns.filter(
				(col) => col.priority === "always" || col.priority === "desktop"
			);
		case "large":
			return columns;
		default:
			return columns;
	}
}
