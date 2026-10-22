import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="unauthorized-title">
        <ShieldX className="unauthorized-icon" size={38} aria-hidden="true" />
        <p className="eyebrow">AKSES DITOLAK</p>
        <h1 id="unauthorized-title">Tidak memiliki izin</h1>
        <p className="muted">Akun Anda tidak memiliki role yang diperlukan untuk halaman ini.</p>
        <Button asChild><Link href="/">Kembali ke dashboard</Link></Button>
      </section>
    </main>
  );
}
