import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { VolleyballLoader } from "@/components/volleyball";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUserId, getPlayerProfile, SIGN_IN_PATH } from "@/modules/identity";
import { RETURN_PATH_PARAM } from "../ingresar/sign-in-with-password";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mi perfil · Convoley" };

const PROFILE_PATH = "/perfil";

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-8">
      <PageHeading icon={UserRound} eyebrow="Convoley" title="Mi perfil">
        Con estos datos te inscribes a las convocatorias.
      </PageHeading>
      <Suspense fallback={<VolleyballLoader />}>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Profile() {
  const userId = await currentUserId();
  if (!userId) {
    redirect(`${SIGN_IN_PATH}?${new URLSearchParams({ [RETURN_PATH_PARAM]: PROFILE_PATH })}`);
  }
  const profile = await getPlayerProfile(userId);
  if (!profile) redirect(SIGN_IN_PATH);
  return <ProfileForm profile={profile} />;
}
