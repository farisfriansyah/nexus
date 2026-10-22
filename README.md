# Nexus Plant Management Dashboard

Fondasi dashboard plant dengan mode TV dan Analitik. Widget sengaja tetap kosong; aplikasi tidak mengarang angka bisnis.

## Menjalankan

Persyaratan: Node.js 20.9+ dan pnpm.

```bash
pnpm install
Copy-Item .env.example .env.local
# Isi AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
pnpm dev
```

Untuk menghasilkan secret lokal: `npx auth secret` atau buat nilai acak minimal 32 karakter. Jangan commit `.env.local`.

## Google OAuth

1. Di Google Cloud Console, buat/pilih project dan aktifkan Google Identity / OAuth.
2. Konfigurasikan consent screen. Jika organisasi memakai Google Workspace, pilih **Internal** untuk membatasi pengguna ke organisasi.
3. Buat OAuth Client ID bertipe **Web application**.
4. Tambahkan Authorized JavaScript origin `http://localhost:3000`.
5. Tambahkan Authorized redirect URI `http://localhost:3000/api/auth/callback/google` (ganti origin sesuai domain produksi).
6. Salin client ID dan secret ke `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET`; set `AUTH_URL`, `AUTH_SECRET`, dan `ALLOWED_EMAIL_DOMAIN` di deployment.

Pembatasan domain diperiksa server-side di callback Auth.js: email harus terverifikasi, domain harus cocok persis tanpa membedakan kapital, dan klaim `hd` jika diberikan harus cocok. `hd` yang dikirim saat authorize hanyalah petunjuk UI, bukan kontrol keamanan.

## Konfigurasi

| Variabel | Fungsi | Default |
| --- | --- | --- |
| `AUTH_SECRET` | Kunci sesi Auth.js | wajib |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Kredensial Google OAuth | wajib |
| `ALLOWED_EMAIL_DOMAIN` | Domain email yang diizinkan | `mikatasa.com` |
| `ADMIN_EMAILS` | Daftar email admin dipisah koma | kosong |
| `SESSION_MAX_AGE_SECONDS` | Durasi maksimum sesi JWT | 30 hari |
| `API_BASE_URL` | URL backend CI4/Laravel untuk BFF | tidak ada |
| `HEARTBEAT_RELOAD_MINUTES` | Watchdog jika heartbeat macet | 10 menit |

Route privat memeriksa sesi di proxy, server layout, serta handler yang memerlukan autentikasi. Route API backend sebaiknya menggunakan `requireSession()` di setiap handler.

## Struktur dan validasi

- Tab tunggal dikonfigurasi pada `src/config/tabs.ts`; seed layout TV/Analitik berupa data bertipe dan divalidasi Zod.
- Preferensi lokal disimpan per email/perangkat lewat repository versioned dengan migrasi. Implementasi repository API dapat menggantikan local storage.
- Route `/api/mock/stream` mengirim heartbeat SSE; belum mengandung metrik bisnis.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`, dan `pnpm build`.
- Playwright menggunakan sesi viewer tiruan yang hanya aktif pada environment non-production melalui `AUTH_E2E_BYPASS`; jangan set variabel ini di deployment. Validasi Google OAuth live tetap perlu kredensial dan diuji manual di environment terkonfigurasi.

## Checklist verifikasi manual

- [ ] Login dengan email domain yang salah ditolak dan pesan domain ditampilkan.
- [ ] Coba ukuran 1280×720, 1366×768, 1920×1080, 2560×1440, dan 3840×2160 di setiap tab.
- [ ] Pastikan TV mode tidak scroll, uji keyboard, drag/swipe, autoplay, pause/resume, dan slide yang di-hide.
- [ ] Uji tampilan pada layar TV nyata, Wake Lock, fullscreen, dan kursor auto-hide.
- [ ] Ganti tema dark/light dan cek kontras.
- [ ] Sembunyikan semua widget pada satu slide, pastikan slide dilewati; reload dan cek persistensi.
