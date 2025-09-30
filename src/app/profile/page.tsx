import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      whatsapp: true,
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <ProfileForm user={user} />;
}
