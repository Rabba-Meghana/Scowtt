import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { favoriteMovie: true },
  });

  if (!user?.favoriteMovie) {
    return NextResponse.json(
      { message: "No favourite movie set." },
      { status: 400 }
    );
  }

  const movie = user.favoriteMovie;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: "You are a movie expert. Return exactly one fascinating, little-known fact about the given movie. Keep it to 2-3 sentences. Be specific and surprising.",
        },
        {
          role: "user",
          content: `Tell me a fun fact about the movie: "${movie}"`,
        },
      ],
    });

    const factText = completion.choices[0]?.message?.content?.trim() ?? "No fact could be generated.";

    // Save to database for history
    await prisma.movieFact.create({
      data: {
        userId,
        movie,
        factText,
        isGenerating: false,
      },
    });

    return NextResponse.json({
      factText,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/fact] Error:", err);
    return NextResponse.json(
      { message: "Could not generate a fact right now. Please try again later." },
      { status: 503 }
    );
  }
}