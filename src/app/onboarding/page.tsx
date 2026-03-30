import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { onboarded: true, name: true } });
  if (user?.onboarded) redirect("/dashboard");
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <main style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden", fontFamily: "var(--ff)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,148,12,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,148,12,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(201,148,12,0.035) 1px, transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />

      <div className="fade-up" style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
          <div className="float" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 20, background: "rgba(201,148,12,0.1)", border: "1px solid rgba(201,148,12,0.3)", marginBottom: 24, boxShadow: "0 0 40px rgba(201,148,12,0.12)" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M7 2v11m0 0a4 4 0 1 0 8 0m-8 0h8m0-11v11" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 2h14" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14, fontWeight: 600 }}>One last step</p>
          <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(32px,6vw,52px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 14, letterSpacing: "-0.01em" }}>
            Hey, <span className="gold-text">{firstName}!</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-3)", lineHeight: 1.75, fontWeight: 300 }}>
            What&apos;s your all-time favourite film?<br />We&apos;ll generate fascinating facts about it.
          </p>
        </div>
        <div className="glass" style={{ padding: "2.25rem" }}>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
