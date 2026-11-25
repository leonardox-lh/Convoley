import { Button } from "@/components/ui/button";
import { isGoogleSignInEnabled } from "@/modules/identity";
import { signInWithGoogleAction } from "./actions";
import { RETURN_PATH_PARAM } from "./sign-in-with-password";

/** "Continuar con Google" plus the divider before the email form; hidden without Google keys. */
export function GoogleSignInButton({ returnPath }: { returnPath: string }) {
  if (!isGoogleSignInEnabled) return null;
  return (
    <>
      <form action={signInWithGoogleAction}>
        <input type="hidden" name={RETURN_PATH_PARAM} value={returnPath} />
        <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
          Continuar con Google
        </Button>
      </form>
      <p className="text-center text-sm text-zinc-500">o con tu correo</p>
    </>
  );
}
