import { redirect } from "next/navigation";
import { getCurrentCmsUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  if (await getCurrentCmsUser()) redirect("/admin");
  const { returnTo = "/admin" } = await searchParams;
  return (
    <main className="cms-login">
      <section className="cms-login-card">
        <span className="cms-login-mark">Хроники преображения Мира</span>
        <h1>Управление сайтом</h1>
        <p>Войдите, чтобы создавать, редактировать и публиковать материалы.</p>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}
