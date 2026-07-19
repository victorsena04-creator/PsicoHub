import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";
import { FormCriarConsultorio } from "@/components/dev/FormCriarConsultorio";
import { FormCriarAcesso } from "@/components/dev/FormCriarAcesso";

export const dynamic = "force-dynamic";

export default async function DevAdminPage() {
  const sessao = obterSessao();
  
  // Bloquear acesso se o usuário logado não for o desenvolvedor oficial
  const devEmail = process.env.DEV_EMAIL || "";
  if (!sessao || sessao.email.toLowerCase() !== devEmail.toLowerCase()) {
    redirect("/dashboard");
  }

  // Buscar todos os consultórios cadastrados na nuvem
  const consultoriosSnapshot = await firestore.collection("consultorios").get();
  const consultorios = consultoriosSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      nome: data.nome || "Sem nome"
    };
  });

  // Ordenar consultórios por nome
  consultorios.sort((a, b) => a.nome.localeCompare(b.nome));

  // Buscar todos os acessos criados na nuvem para exibição rápida
  const usuariosSnapshot = await firestore.collection("usuarios").get();
  const usuarios = usuariosSnapshot.docs.map(doc => {
    const data = doc.data();
    const consultorio = consultorios.find(c => c.id === data.consultorioId);
    return {
      email: doc.id,
      consultorioNome: consultorio ? consultorio.nome : "Desconhecido/Dev",
      role: data.role || "principal",
      ativo: data.ativo !== undefined ? data.ativo : 1
    };
  });

  usuarios.sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 antialiased">
      {/* Cabeçalho do Painel Admin */}
      <div className="mb-8 border-b border-outline-variant pb-6">
        <div className="flex items-center gap-2 text-primary mb-1">
          <span className="material-symbols-outlined text-[28px]">terminal</span>
          <h2 className="font-headline-lg text-headline-lg font-semibold">
            Painel do Desenvolvedor (Admin)
          </h2>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Gerencie a infraestrutura multi-tenant do PsicoHub. Crie novos consultórios na nuvem e conceda acessos seguros.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seção 1: Criar Consultório */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[20px] text-primary">domain_add</span>
              Novo Consultório (Tenant)
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Cadastre o consultório do psicólogo. Isso criará uma partição isolada de dados no banco de dados.
            </p>
          </div>

          <FormCriarConsultorio />
        </div>

        {/* Seção 2: Conceder Acesso */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[20px] text-primary">person_add</span>
              Liberar Acesso Google Auth
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Vincule um e-mail do Google (Gmail ou Google Workspace) a um consultório com um papel específico.
            </p>
          </div>

          <FormCriarAcesso consultorios={consultorios} />
        </div>

        {/* Seção 3: Lista de Acessos Ativos */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-primary">supervisor_account</span>
            Lista de Acessos Autorizados
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-body-md text-body-md text-left">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-semibold text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4">E-mail do Google</th>
                  <th className="pb-3 px-4">Consultório Vinculado</th>
                  <th className="pb-3 px-4">Papel</th>
                  <th className="pb-3 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                {usuarios.map(u => (
                  <tr key={u.email} className="hover:bg-surface-container-lowest/40 transition-colors">
                    <td className="py-3.5 pr-4 font-mono text-xs">{u.email}</td>
                    <td className="py-3.5 px-4 font-semibold">{u.consultorioNome}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'principal' ? 'bg-primary-container/10 text-primary' : 'bg-secondary-container/20 text-secondary'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${u.ativo ? 'text-secondary' : 'text-error'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-secondary' : 'bg-error'}`}></span>
                        {u.ativo ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
