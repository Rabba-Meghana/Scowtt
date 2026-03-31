import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/facts - returns last 8 facts for the current user's movie
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { favoriteMovie: true },
  });

  if (!user?.favoriteMovie) {
    return NextResponse.json({ facts: [] });
  }

  const facts = await prisma.movieFact.findMany({
    where: {
      userId:       session.user.id,
      movie:        user.favoriteMovie,
      isGenerating: false,
      factText:     { not: "" },
    },
    orderBy: { generatedAt: "desc" },
    take: 8,
    select: { factText: true, generatedAt: true, movie: true },
  });

  return NextResponse.json({ facts });
}
