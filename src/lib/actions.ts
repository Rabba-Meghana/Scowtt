"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { movieSchema } from "@/lib/validations";

export async function saveMovie(
  movie: string
): Promise<{ error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const parsed = movieSchema.safeParse(movie);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid movie name." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  {
      favoriteMovie: parsed.data,
      onboarded:     true,
    },
  });

  return {};
}
