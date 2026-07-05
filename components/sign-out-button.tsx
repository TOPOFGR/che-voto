import { signOut } from "@/app/actions";
import { LogoutIcon } from "@/components/icons";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        title="Cerrar sesión"
        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <LogoutIcon className="w-5 h-5" />
      </button>
    </form>
  );
}
