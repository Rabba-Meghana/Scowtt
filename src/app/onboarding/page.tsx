import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { onboarded: true, name: true },
  });

  // Already onboarded — go straight to dashboard
  if (user?.onboarded) redirect("/dashboard");

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="page-bg min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-base)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke="var(--gold-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1
            className="font-display text-2xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Welcome, {firstName}!
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Let&apos;s personalise your experience. What&apos;s your all-time favourite movie?
          </p>
        </div>

        <div className="card">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
