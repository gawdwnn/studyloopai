import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { useEffect, useState } from "react";

export const useCurrentUserImage = () => {
	const [image, setImage] = useState<string | null>(null);

	useEffect(() => {
		const fetchUserImage = async () => {
			const supabase = createClient();
			const { data, error } = await supabase.auth.getSession();
			if (error) {
				logger.error("Failed to fetch user session for image", {
					message: error.message,
					code: error.code,
				});
			}

			setImage(data.session?.user.user_metadata.avatar_url ?? null);
		};
		fetchUserImage();
	}, []);

	return image;
};
