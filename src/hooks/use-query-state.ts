"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * A custom hook to manage state in the URL query parameters.
 * It provides the raw searchParams object and a setter function
 * to update multiple query parameters at once.
 *
 * @returns An object containing the current `searchParams` and a `setQueryState` function.
 */
export function useQueryState() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	/**
	 * Updates the URL query parameters with the provided values.
	 *
	 * @param updates - An object where keys are the query param names
	 * and values are the new values. A value of `null` or `undefined`
	 * will remove the parameter from the URL. Arrays are joined with commas.
	 */
	const setQueryState = useCallback(
		(updates: Record<string, string | number | string[] | null | undefined>) => {
			const newSearchParams = new URLSearchParams(searchParams.toString());

			for (const [key, value] of Object.entries(updates)) {
				if (value === null || value === undefined) {
					newSearchParams.delete(key);
				} else if (Array.isArray(value)) {
					if (value.length > 0) {
						newSearchParams.set(key, value.join(","));
					} else {
						// Remove the parameter if the array is empty
						newSearchParams.delete(key);
					}
				} else {
					newSearchParams.set(key, String(value));
				}
			}

			// If there are no params, just use the pathname.
			const newUrl = newSearchParams.toString()
				? `${pathname}?${newSearchParams.toString()}`
				: pathname;

			// Using `replace` to avoid polluting the browser's history
			router.replace(newUrl, { scroll: false });
		},
		[pathname, router, searchParams]
	);

	return { searchParams, setQueryState };
}
