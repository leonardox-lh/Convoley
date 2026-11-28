import { LayoutGrid, UserRound } from "lucide-react";
import Link from "next/link";
import { findFirstClubSlugForMember } from "@/modules/clubs";
import { currentUserId, SIGN_IN_PATH } from "@/modules/identity";
import { RETURN_PATH_PARAM } from "./ingresar/sign-in-with-password";
import { PROFILE_BUTTON_CLASS, SignInPrompt } from "./sign-in-prompt";

/**
 * Right side of every top bar: "Mi club" for club members (owner or helper) and the person icon,
 * which opens the profile when signed in and otherwise nudges to sign in.
 * The club panel has its own "Mi club", so it passes myClub={false}.
 */
export async function ProfileButton({ myClub = true }: { myClub?: boolean }) {
  const userId = await currentUserId();
  if (!userId) {
    return <SignInPrompt signInPath={SIGN_IN_PATH} returnPathParam={RETURN_PATH_PARAM} />;
  }
  const clubSlug = myClub ? await findFirstClubSlugForMember(userId) : null;
  return (
    <div className="flex items-center gap-2">
      {clubSlug && (
        <Link
          href={`/admin/${clubSlug}`}
          data-header-pill
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          <LayoutGrid className="size-4" aria-hidden />
          Mi club
        </Link>
      )}
      <Link href="/perfil" aria-label="Mi perfil" className={PROFILE_BUTTON_CLASS}>
        <UserRound className="size-5" aria-hidden />
      </Link>
    </div>
  );
}
