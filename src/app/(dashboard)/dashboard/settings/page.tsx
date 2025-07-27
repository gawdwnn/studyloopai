import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">
					Manage your application preferences
				</p>
			</div>

			{/* Appearance Settings Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>
						Customize how StudyLoop looks and feels
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Appearance settings</p>
				</CardContent>
			</Card>

			{/* Notification Settings Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Notifications</CardTitle>
					<CardDescription>
						Choose what notifications you'd like to receive
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Notification settings</p>
				</CardContent>
			</Card>

			{/* Study Preferences Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Study Preferences</CardTitle>
					<CardDescription>
						Configure your learning and study preferences
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Study preferences</p>
				</CardContent>
			</Card>

			{/* Language & Region Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Language & Region</CardTitle>
					<CardDescription>
						Set your language and regional preferences
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Language settings</p>
				</CardContent>
			</Card>

			{/* Audio Settings Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Audio Settings</CardTitle>
					<CardDescription>
						Configure audio and sound preferences
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Audio settings</p>
				</CardContent>
			</Card>
		</div>
	);
}
