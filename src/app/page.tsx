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
    <main style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-dm-sans)", position: "relative", overflow: "hidden" }}>
      {/* Background orbs */}
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="fade-up" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 20, background: "var(--cream-2)", border: "1px solid var(--border)", marginBottom: 20, boxShadow: "var(--shadow)" }}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="17" stroke="var(--gold)" strokeWidth="1.5"/>
              <circle cx="20" cy="20" r="5" fill="var(--gold)" opacity="0.15"/>
              <circle cx="20" cy="20" r="2.5" fill="var(--gold)"/>
              <circle cx="20" cy="8"  r="2.8" fill="var(--gold)" opacity="0.6"/>
              <circle cx="20" cy="32" r="2.8" fill="var(--gold)" opacity="0.6"/>
              <circle cx="8"  cy="20" r="2.8" fill="var(--gold)" opacity="0.6"/>
              <circle cx="32" cy="20" r="2.8" fill="var(--gold)" opacity="0.6"/>
              <circle cx="11.5" cy="11.5" r="2.2" fill="var(--gold)" opacity="0.35"/>
              <circle cx="28.5" cy="11.5" r="2.2" fill="var(--gold)" opacity="0.35"/>
              <circle cx="11.5" cy="28.5" r="2.2" fill="var(--gold)" opacity="0.35"/>
              <circle cx="28.5" cy="28.5" r="2.2" fill="var(--gold)" opacity="0.35"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1.1, marginBottom: 10 }}>Movie Memory</h1>
          <p style={{ fontSize: 15, color: "var(--text-3)", lineHeight: 1.6 }}>Your personal cinema companion.<br/>Discover facts about films you love.</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: "2rem" }}>
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
            Sign in to save your favourite movie and get AI-powered facts instantly.
          </p>
          <SignInButton />
          <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 16, opacity: 0.7 }}>
            We only access your name, email and profile photo.
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-3)", opacity: 0.5 }}>
          Powered by OpenAI · Next.js · Postgres
        </p>
      </div>
    </main>
  );
}
