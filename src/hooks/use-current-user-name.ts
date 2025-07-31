import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { useEffect, useState } from "react";

export const useCurrentUserName = () => {
	const [name, setName] = useState<string | null>(null);

	useEffect(() => {
		const fetchProfileName = async () => {
			const supabase = createClient();
			const { data, error } = await supabase.auth.getSession();
			if (error) {
				logger.error("Failed to fetch user session for name", {
					message: error.message,
					code: error.code,
				});
			}

			setName(data.session?.user.user_metadata.full_name ?? "?");
		};

		fetchProfileName();
	}, []);

	return name || "?";
};
