import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SignInButton from "@/components/SignInButton";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { onboarded: true } });
    redirect(user?.onboarded ? "/dashboard" : "/onboarding");
  }
  return (
    <main style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden", fontFamily: "var(--ff)" }}>

      {/* Deep background layers */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,148,12,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(100,60,5,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,148,12,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,148,12,0.04) 1px, transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none" }} />
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />

      {/* Orbiting dots */}
      {[0,60,120,180,240,300].map((deg, i) => (
        <div key={i} style={{
          position: "absolute", top: "50%", left: "50%",
          width: 3, height: 3, borderRadius: "50%",
          background: "var(--gold)",
          opacity: 0.25,
          transform: `rotate(${deg}deg) translateX(${260 + i * 30}px)`,
          animation: `twinkle ${2 + i * 0.4}s ${i * 0.3}s ease-in-out infinite`,
        }} />
      ))}

      <div className="fade-up" style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 2, textAlign: "center" }}>
        {/* Film reel logo */}
        <div className="float" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 88, height: 88, borderRadius: 26, background: "rgba(201,148,12,0.08)", border: "1px solid rgba(201,148,12,0.28)", marginBottom: 32, boxShadow: "0 0 60px rgba(201,148,12,0.15), inset 0 1px 0 rgba(201,148,12,0.2)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="var(--gold)" strokeWidth="1.2"/>
            <circle cx="24" cy="24" r="20" stroke="url(#g1)" strokeWidth="1.2" strokeDasharray="4 4"/>
            <circle cx="24" cy="24" r="4.5" fill="var(--gold)" opacity="0.2"/>
            <circle cx="24" cy="24" r="2.2" fill="var(--gold)"/>
            <circle cx="24" cy="10" r="3.2" fill="var(--gold)" opacity="0.7"/>
            <circle cx="24" cy="38" r="3.2" fill="var(--gold)" opacity="0.7"/>
            <circle cx="10" cy="24" r="3.2" fill="var(--gold)" opacity="0.7"/>
            <circle cx="38" cy="24" r="3.2" fill="var(--gold)" opacity="0.7"/>
            <circle cx="13.5" cy="13.5" r="2.5" fill="var(--gold)" opacity="0.4"/>
            <circle cx="34.5" cy="13.5" r="2.5" fill="var(--gold)" opacity="0.4"/>
            <circle cx="13.5" cy="34.5" r="2.5" fill="var(--gold)" opacity="0.4"/>
            <circle cx="34.5" cy="34.5" r="2.5" fill="var(--gold)" opacity="0.4"/>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--gold)" stopOpacity="0"/>
                <stop offset="0.5" stopColor="var(--gold-bright)" stopOpacity="0.8"/>
                <stop offset="1" stopColor="var(--gold)" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 18, fontWeight: 600 }}>Your personal cinema</p>
        <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(52px,10vw,78px)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.02em", marginBottom: 20 }} className="gold-text">Movie<br />Memory</h1>
        <p style={{ fontSize: 15, color: "var(--text-3)", lineHeight: 1.75, marginBottom: 44, fontWeight: 300 }}>
          Discover fascinating, AI-powered facts<br />about the films you love.
        </p>

        <div className="glass" style={{ padding: "2rem 2.25rem" }}>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20, lineHeight: 1.6 }}>Sign in to save your favourite movie and unlock AI-generated cinema facts.</p>
          <SignInButton />
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 16, opacity: 0.5, lineHeight: 1.6 }}>We only access your name, email and profile photo.</p>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 28, opacity: 0.35, letterSpacing: "0.06em" }}>
          Next.js 15 · Prisma · PostgreSQL · OpenAI · NextAuth
        </p>
      </div>
    </main>
  );
}
