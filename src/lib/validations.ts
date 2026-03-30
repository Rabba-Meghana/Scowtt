import { z } from "zod";

export const movieSchema = z
  .string()
  .trim()
  .min(1,   { message: "Movie name cannot be empty." })
  .max(200, { message: "Movie name must be 200 characters or fewer." });

export const onboardingSchema = z.object({
  movie: movieSchema,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
