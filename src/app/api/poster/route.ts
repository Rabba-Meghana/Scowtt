import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const movie = req.nextUrl.searchParams.get("movie");
  if (!movie) return NextResponse.json({ posterUrl: null });

  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return NextResponse.json({ posterUrl: null });

    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movie)}&page=1`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const posterPath = data?.results?.[0]?.poster_path;
    if (!posterPath) return NextResponse.json({ posterUrl: null });

    return NextResponse.json({
      posterUrl: `https://image.tmdb.org/t/p/w500${posterPath}`,
    });
  } catch {
    return NextResponse.json({ posterUrl: null });
  }
}
