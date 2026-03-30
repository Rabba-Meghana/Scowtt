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
    <main style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,146,10,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(200,146,10,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,146,10,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
      <div className="fade-up" style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: "rgba(200,146,10,0.1)", border: "1px solid rgba(200,146,10,0.3)", marginBottom: 20 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>✦ One last thing ✦</p>
          <h1 style={{ fontFamily: "var(--fp)", fontSize: "clamp(28px,6vw,44px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 12 }} className="gold-shimmer">Hey {firstName}!</h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.7 }}>What&apos;s your all-time favourite movie? We&apos;ll generate fascinating AI facts about it.</p>
        </div>
        <div className="glass" style={{ padding: "2rem" }}>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
