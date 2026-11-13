import { signIn } from "@/auth";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Factory, ShieldAlert } from "lucide-react";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <div className="login-tools"><ThemeToggle /></div>
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark"><Factory aria-hidden="true" /></div>
        <p className="eyebrow">PLANT MANAGEMENT</p>
        <h1 id="login-title">Nexus</h1>
        <p className="muted">Dashboard operasional plant</p>
        {error && (
          <div role="alert" className="alert alert-warning">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>{error === "domain" ? "Akses hanya tersedia untuk email organisasi yang diizinkan." : "Login gagal. Silakan coba kembali."}</span>
          </div>
        )}
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <Button className="login-button" type="submit">Masuk dengan Google</Button>
        </form>
        <p className="login-note">Gunakan akun organisasi yang terdaftar.</p>
      </section>
    </main>
  );
}
