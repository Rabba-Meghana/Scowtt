import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CACHE_WINDOW_MS = 60_000;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { favoriteMovie: true },
  });

  if (!user?.favoriteMovie) {
    return NextResponse.json({ message: "No favourite movie set." }, { status: 400 });
  }

  const movie = user.favoriteMovie;
  const now   = new Date();

  // 1. Check 60-second server cache
  const recent = await prisma.movieFact.findFirst({
    where: {
      userId,
      movie,
      generatedAt:  { gte: new Date(now.getTime() - CACHE_WINDOW_MS) },
      isGenerating: false,
    },
    orderBy: { generatedAt: "desc" },
  });

  if (recent) {
    return NextResponse.json({
      factText:    recent.factText,
      generatedAt: recent.generatedAt.toISOString(),
      cached:      true,
    });
  }

  // 2. Burst protection - check if generation already in flight
  const inFlight = await prisma.movieFact.findFirst({
    where: { userId, movie, isGenerating: true },
  });

  if (inFlight) {
    const lastFact = await prisma.movieFact.findFirst({
      where:   { userId, movie, isGenerating: false },
      orderBy: { generatedAt: "desc" },
    });

    if (lastFact) {
      return NextResponse.json({
        factText:    lastFact.factText,
        generatedAt: lastFact.generatedAt.toISOString(),
        cached:      true,
      });
    }

    return NextResponse.json(
      { message: "Fact generation in progress, please try again." },
      { status: 202 }
    );
  }

  // 3. Create lock row
  const placeholder = await prisma.movieFact.create({
    data: { userId, movie, factText: "", isGenerating: true },
  });

  try {
    // 4. Call OpenAI
    const completion = await openai.chat.completions.create({
      model:      "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role:    "system",
          content: "You are a movie expert. Return exactly one fascinating, little-known fact about the given movie. Keep it to 2-3 sentences. Be specific and surprising.",
        },
        {
          role:    "user",
          content: `Tell me a fun fact about the movie: "${movie}"`,
        },
      ],
    });

    const factText = completion.choices[0]?.message?.content?.trim() ?? "No fact could be generated.";

    // 5. Save and release lock
    const completed = await prisma.movieFact.update({
      where: { id: placeholder.id },
      data:  { factText, isGenerating: false, generatedAt: new Date() },
    });

    return NextResponse.json({
      factText:    completed.factText,
      generatedAt: completed.generatedAt.toISOString(),
      cached:      false,
    });
  } catch (err) {
    // 6. Release lock on failure, return last good fact or 503
    await prisma.movieFact.delete({ where: { id: placeholder.id } });
    console.error("[/api/fact] OpenAI error:", err);

    const fallback = await prisma.movieFact.findFirst({
      where:   { userId, movie, isGenerating: false },
      orderBy: { generatedAt: "desc" },
    });

    if (fallback) {
      return NextResponse.json({
        factText:    fallback.factText,
        generatedAt: fallback.generatedAt.toISOString(),
        cached:      true,
      });
    }

    return NextResponse.json(
      { message: "Could not generate a fact right now. Please try again later." },
      { status: 503 }
    );
  }
}
