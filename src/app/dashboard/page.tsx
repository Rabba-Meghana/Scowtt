import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:            true,
      name:          true,
      email:         true,
      image:         true,
      favoriteMovie: true,
      onboarded:     true,
    },
  });

  if (!user) redirect("/");
  if (!user.onboarded) redirect("/onboarding");

  return <DashboardClient user={user} />;
}
