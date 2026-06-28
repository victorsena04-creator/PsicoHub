import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormSuporte } from "./FormSuporte";

export const dynamic = 'force-dynamic';

export default function SuportePage() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("psicohub_session");

  if (!sessionCookie) {
    redirect("/login");
  }

  let session: any;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    redirect("/login");
  }

  // Impedir que o psicólogo comum (principal) acesse esta tela de ferramentas
  if (session.role !== "suporte") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
        <span className="material-symbols-outlined text-primary text-[32px]">
          admin_panel_settings
        </span>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Painel de Suporte Técnico
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Acesso administrativo exclusivo. Redefina a senha da conta principal.
          </p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 text-xs leading-relaxed text-on-surface">
        <span className="font-bold block mb-1">🚨 Manutenção do ERP</span>
        Você está autenticado como suporte de infraestrutura local. Este painel permite que você altere/redefina a senha da conta do administrador principal (`admin`) sem precisar acessar o banco SQLite manualmente.
      </div>

      <FormSuporte />
    </div>
  );
}
