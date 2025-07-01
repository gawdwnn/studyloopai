import { AppTabNav } from "@/components/app-tab-nav";

export default function MaterialsPage() {
	const tabs = [
		{ label: "My Materials", href: "/materials" },
		{ label: "Upload", href: "/materials/upload" },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
				<p className="text-muted-foreground">Upload and manage your study materials</p>
			</div>
			<AppTabNav tabs={tabs} />
			<div className="grid gap-4">{/* Content will be added here */}</div>
		</div>
	);
}
