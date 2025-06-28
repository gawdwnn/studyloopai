/**
 * Authentication and signup flow constants
 * These constants match the database schema and documentation
 */

export const SIGNUP_STEPS = {
  INCOMPLETE: 1,
  COMPLETE: 2,
} as const;

export type SignupStep = typeof SIGNUP_STEPS[keyof typeof SIGNUP_STEPS];

/**
 * Check if a signup step value is valid
 */
export function isValidSignupStep(value: number): value is SignupStep {
  return Object.values(SIGNUP_STEPS).includes(value as SignupStep);
}

/**
 * Get the next signup step
 */
export function getNextSignupStep(currentStep: SignupStep): SignupStep | null {
  if (currentStep === SIGNUP_STEPS.INCOMPLETE) {
    return SIGNUP_STEPS.COMPLETE;
  }
  return null; // Already at final step
}