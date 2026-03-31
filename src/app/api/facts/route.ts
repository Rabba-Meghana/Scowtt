import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const facts = await prisma.movieFact.findMany({
    where: {
      userId:       session.user.id,
      isGenerating: false,
      factText:     { not: "" },
    },
    orderBy: { generatedAt: "desc" },
    take: 20,
    select: { factText: true, generatedAt: true, movie: true },
  });

  return NextResponse.json({ facts });
}
