import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { movieSchema } from "@/lib/validations";

export async function PUT(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  // Server-side validation
  const parsed = movieSchema.safeParse(
    typeof body === "object" && body !== null && "movie" in body
      ? (body as { movie: unknown }).movie
      : undefined
  );

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const movie = parsed.data;

  const user = await prisma.user.update({
    where:  { id: session.user.id },
    data:   { favoriteMovie: movie },
    select: { favoriteMovie: true },
  });

  return NextResponse.json({ favoriteMovie: user.favoriteMovie });
}
