import * as z from "zod";

export const magicLinkSchema = z.object({
	email: z
		.string()
		.min(1, "Email is required")
		.max(255, "Email is too long")
		.email("Please enter a valid email address")
		.toLowerCase()
		.transform((value) => value.trim()),
});

export const onboardingProfileSchema = z.object({
	firstName: z
		.string()
		.min(2, "First name must be at least 2 characters")
		.optional(),
	lastName: z
		.string()
		.min(2, "Last name must be at least 2 characters")
		.optional(),
	country: z.string().min(1, "Please select your country").optional(),
});

export const termsSchema = z.object({
	agreeToTerms: z.boolean().refine((val) => val === true, {
		message: "You must agree to the terms and conditions",
	}),
});

export type MagicLinkFormData = z.infer<typeof magicLinkSchema>;
export type OnboardingProfileData = z.infer<typeof onboardingProfileSchema>;
export type TermsData = z.infer<typeof termsSchema>;

export type SignInFormData = MagicLinkFormData;
export type SignUpFormData = MagicLinkFormData &
	OnboardingProfileData &
	TermsData;
