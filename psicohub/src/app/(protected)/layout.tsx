import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar se o cookie de sessão existe. Caso contrário, redireciona ao login.
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("psicohub_session");

  if (!sessionCookie) {
    redirect("/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}