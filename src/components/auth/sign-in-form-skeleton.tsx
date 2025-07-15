import { Skeleton } from "@/components/ui/skeleton";

export function SignInFormSkeleton() {
	return (
		<div className="mx-auto w-full max-w-md rounded-xl p-8 sm:p-10">
			<div className="text-center mb-6 space-y-2">
				<Skeleton className="h-8 w-3/4 mx-auto" />
				<Skeleton className="h-5 w-1/2 mx-auto" />
			</div>

			<div className="mb-6">
				<Skeleton className="h-10 w-full" />
			</div>

			<div className="relative mb-6">
				<div className="absolute inset-0 flex items-center">
					<Skeleton className="h-[1px] w-full" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-transparent">Or continue with email</span>
				</div>
			</div>

			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>

			<div className="mt-8 text-center space-y-4">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6 mx-auto" />
			</div>
		</div>
	);
}
