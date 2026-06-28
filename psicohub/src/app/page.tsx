import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona o usuário diretamente para a tela de login ao acessar a raiz do site
  redirect("/login");
}