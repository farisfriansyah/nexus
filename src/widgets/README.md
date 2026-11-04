# Widget

Satu widget = satu folder. Semua yang menyangkut widget itu ada di dalamnya.

```
src/widgets/
  _primitives/           UI dasar bersama (kartu, status, chart) + CSS masing-masing
  ops-eng/
    index.ts             daftar widget tab (satu baris per widget)
    layout.ts            susunan slide/baris tab
    schemas.ts           tipe data tab
    _shared/             bagian yang dipakai >1 widget (data, selector, tile, drawer) + CSS-nya
    ops-mtbf/            contoh widget mandiri
      widget.tsx         tampilan kartu
      widget.css         gaya khusus widget (prefix class unik)
      data.ts            hook/pengambilan data khusus widget
      detail.tsx         isi drawer detail (Analitik)
      index.ts           definisi: id, judul, PIC
```

Widget yang hanya merangkai komponen bersama (mis. daftar bulanan `MonthlyListWidget`, tile live) cukup berisi `widget.tsx` + `index.ts`; gayanya ada di `_shared/*.css`.

## Panel listrik per fasa

Tab Ops. Eng memiliki empat slide **Panel Listrik · Per Fasa** untuk Reaktor 1–4. Tiap slide menampilkan enam widget yang sama: kartu Fasa 1/L1, Fasa 2/L2, Fasa 3/L3, grafik Arus Fasa, Tegangan Fasa, dan Cos Total. Presentasi dibagikan melalui `_shared/phase-monitor.tsx` dan `phase-monitor.css`; tiap widget tetap didaftarkan sendiri di registry dan layout.

Nilainya saat ini simulasi realtime dari `mocks/ops-eng/live.ts` dengan tick setiap 2 detik, bukan pembacaan panel aktual. Warna permukaan, teks, dan grid mengikuti token tema aplikasi agar tetap terbaca di tema terang maupun gelap.

## Membuat widget baru

```
pnpm new:widget energy-trend "Tren Energi" Ega
# tab lain / dibagikan ke tab lain:
pnpm new:widget oee "OEE" Budi --tab plant-kpi
pnpm new:widget water-pressure "Tekanan Air" Rozak --tab ops-eng --also plant-kpi,reserved   # "*" = semua tab
```

Perintah itu membuat folder `ops-energy-trend/` (widget, css, detail, index) dan mendaftarkannya di `ops-eng/index.ts`. Setelah itu tambahkan id-nya ke `ops-eng/layout.ts`.

## Mengedit widget

Buka folder widget tersebut. CSS di-import langsung oleh `widget.tsx`, jadi tidak perlu menyentuh file global.

## Mengatur slide & layout

Susunan slide kini disimpan di MySQL/MariaDB (Prisma) dan diedit lewat UI: **Analitik ? ikon grid di header ? /analytics/layout/<tab>** (admin). Alur: ubah ? *Simpan draft* ? *Terapkan ke TV* (TV memuat ulang sendiri dalam ~30 dtk). Jika DB kosong/tidak terjangkau, dipakai seed `layout.ts`.

- Model: tiap slide = grid 12 kolom � 1-6 baris; widget punya lebar (� ? � ? Penuh) dan tinggi (baris). Ruang kosong diisi widget berikutnya (dense); layout yang tidak muat ditolak.
- Setup DB: isi `DATABASE_URL` MySQL di `.env.local`, lalu `pnpm db:migrate` (`pnpm db:deploy` di server).
