import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConflictError, OwnNote } from "@/hooks/use-own-notes";
import { MarkdownRenderer } from "./markdown-renderer";

interface ConflictResolutionDialogProps {
	conflict: (ConflictError & { localContent: string }) | null;
	onResolve: (strategy: "client" | "server") => void;
	onCancel: () => void;
}

export function ConflictResolutionDialog({
	conflict,
	onResolve,
	onCancel,
}: ConflictResolutionDialogProps) {
	if (!conflict) return null;

	const serverContent = (conflict.serverData as OwnNote)?.content || "";

	return (
		<Dialog open={!!conflict} onOpenChange={onCancel}>
			<DialogContent className="max-w-5xl">
				<DialogHeader>
					<DialogTitle>Resolve Edit Conflict</DialogTitle>
					<p className="text-sm text-muted-foreground">
						Your note has been modified by another session. Choose which version to keep.
					</p>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-6 mt-4">
					<div>
						<h3 className="font-semibold mb-2">Your Version (Client)</h3>
						<Card className="h-96 overflow-y-auto">
							<CardContent className="p-4">
								<MarkdownRenderer content={conflict.localContent} />
							</CardContent>
						</Card>
						<Button className="w-full mt-4" onClick={() => onResolve("client")}>
							Keep Your Version
						</Button>
					</div>
					<div>
						<h3 className="font-semibold mb-2">Latest Version (Server)</h3>
						<Card className="h-96 overflow-y-auto">
							<CardContent className="p-4">
								<MarkdownRenderer content={serverContent} />
							</CardContent>
						</Card>
						<Button className="w-full mt-4" variant="outline" onClick={() => onResolve("server")}>
							Use Latest Version
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
