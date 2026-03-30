import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SignInButton from "@/components/SignInButton";

export default async function LandingPage() {
  const session = await auth();

  // Already signed in — route to the right place
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { onboarded: true },
    });
    redirect(user?.onboarded ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="page-bg min-h-screen flex flex-col items-center justify-center px-4">
      {/* Decorative film strip top */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold-accent)] to-transparent opacity-40" />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background:  "var(--bg-surface-2)",
              border:      "1px solid var(--border-base)",
            }}
          >
            {/* Film reel icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" stroke="var(--gold-accent)" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="4"  fill="var(--gold-accent)" opacity="0.3"/>
              <circle cx="16" cy="16" r="2"  fill="var(--gold-accent)"/>
              <circle cx="16" cy="7"  r="2.5" fill="var(--gold-accent)" opacity="0.6"/>
              <circle cx="16" cy="25" r="2.5" fill="var(--gold-accent)" opacity="0.6"/>
              <circle cx="7"  cy="16" r="2.5" fill="var(--gold-accent)" opacity="0.6"/>
              <circle cx="25" cy="16" r="2.5" fill="var(--gold-accent)" opacity="0.6"/>
              <circle cx="9.5"  cy="9.5"  r="2" fill="var(--gold-accent)" opacity="0.4"/>
              <circle cx="22.5" cy="9.5"  r="2" fill="var(--gold-accent)" opacity="0.4"/>
              <circle cx="9.5"  cy="22.5" r="2" fill="var(--gold-accent)" opacity="0.4"/>
              <circle cx="22.5" cy="22.5" r="2" fill="var(--gold-accent)" opacity="0.4"/>
            </svg>
          </div>

          <h1
            className="font-display text-3xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Movie Memory
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center" }}>
            Discover fascinating facts about the films you love
          </p>
        </div>

        {/* Sign-in card */}
        <div className="card text-center">
          <p
            className="mb-6"
            style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}
          >
            Sign in to save your favourite movie and get AI-powered facts about it.
          </p>

          <SignInButton />

          <p
            className="mt-5"
            style={{ color: "var(--text-muted)", fontSize: "11px" }}
          >
            We only request your name, email, and profile photo.
          </p>
        </div>

        {/* Tagline */}
        <p
          className="text-center mt-8"
          style={{ color: "var(--text-muted)", fontSize: "12px", opacity: 0.6 }}
        >
          Powered by OpenAI · Built with Next.js
        </p>
      </div>

      {/* Decorative film strip bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold-accent)] to-transparent opacity-40" />
    </main>
  );
}
