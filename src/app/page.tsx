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
    <main style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(200,146,10,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,146,10,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div className="fade-up" style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, borderRadius: 22, background: "rgba(200,146,10,0.1)", border: "1px solid rgba(200,146,10,0.3)", marginBottom: 24, boxShadow: "0 0 40px rgba(200,146,10,0.15)" }} className="float">
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="var(--gold)" strokeWidth="1.5"/>
            <circle cx="20" cy="20" r="4" fill="var(--gold)" opacity="0.2"/>
            <circle cx="20" cy="20" r="2" fill="var(--gold)"/>
            <circle cx="20" cy="9"  r="2.5" fill="var(--gold)" opacity="0.65"/>
            <circle cx="20" cy="31" r="2.5" fill="var(--gold)" opacity="0.65"/>
            <circle cx="9"  cy="20" r="2.5" fill="var(--gold)" opacity="0.65"/>
            <circle cx="31" cy="20" r="2.5" fill="var(--gold)" opacity="0.65"/>
            <circle cx="12" cy="12" r="2" fill="var(--gold)" opacity="0.35"/>
            <circle cx="28" cy="12" r="2" fill="var(--gold)" opacity="0.35"/>
            <circle cx="12" cy="28" r="2" fill="var(--gold)" opacity="0.35"/>
            <circle cx="28" cy="28" r="2" fill="var(--gold)" opacity="0.35"/>
          </svg>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>✦ Your personal cinema ✦</p>
        <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(42px,8vw,64px)", fontWeight: 900, lineHeight: 1.0, marginBottom: 16, letterSpacing: "-0.02em" }} className="gold-shimmer">Movie Memory</h1>
        <p style={{ fontSize: 15, color: "var(--text-3)", lineHeight: 1.7, marginBottom: 40, maxWidth: 360, margin: "0 auto 40px" }}>Your personal cinema companion. Discover fascinating AI-powered facts about the films you love.</p>
        <div className="glass" style={{ padding: "2rem" }}>
          <SignInButton />
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 16, opacity: 0.6 }}>We only access your name, email and profile photo.</p>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 24, opacity: 0.4 }}>Next.js · Prisma · PostgreSQL · OpenAI</p>
      </div>
    </main>
  );
}
