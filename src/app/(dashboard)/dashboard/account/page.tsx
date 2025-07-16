import { AccountBillingSettings } from "@/components/dashboard/account-billing-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Account</h1>
				<p className="text-muted-foreground">Manage your account settings and profile</p>
			</div>

			{/* Profile Settings Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Profile Settings</CardTitle>
					<CardDescription>Manage your personal information and profile details</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Profile settings</p>
				</CardContent>
			</Card>

			{/* Billing Section - Already implemented */}
			<AccountBillingSettings />

			{/* Security Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Security & Privacy</CardTitle>
					<CardDescription>Password, authentication, and privacy settings</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Security settings</p>
				</CardContent>
			</Card>

			{/* Usage Analytics Placeholder */}
			<Card>
				<CardHeader>
					<CardTitle>Usage & Analytics</CardTitle>
					<CardDescription>Track your study progress and insights</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Usage analytics</p>
				</CardContent>
			</Card>
		</div>
	);
}
