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

## Panel listrik Travo

Tab Ops. Eng memiliki empat slide **Panel Listrik · Per Fasa** untuk Travo 1–4. Tiap slide mempertahankan enam widget dan susunan fase yang sama: Fasa 1/L1, Fasa 2/L2, Fasa 3/L3, Arus Fasa, Tegangan Fasa, dan Cos Total. Sumbernya mengambil port dari `tcp_configs.listenerApiPort` untuk `tipe = 'TRAVO'` lalu membaca `/travo` Plant Vision. Nilai widget berasal dari `processedWeight`; detail tiap widget menampilkan nilai mentah `rawWeight` dan nilai terolah. Data diperbarui setiap 5 detik dan ditandai usang bila timestamp API lebih dari 30 detik. Grafik realtime memakai data dalam jendela bergulir maksimal 12 jam.

Slide TV dan Analitik membagikan nomor Travo melalui `TravoSlideProvider`; implementasi visual tetap menggunakan widget fasa bersama di `_shared/phase-monitor.tsx`. Widget fase yang ditampilkan di luar slide Travo tetap memakai simulator `mocks/ops-eng/live.ts`.

Setiap slide juga memuat widget energi (`energy`, `pt`, `pft`, `freq`, `dem`) dan ringkasan sistem (`Zpt`, `Zqt`, `Zst`, `imbalance`). Kartu setiap fase menampilkan `kw`, `pf`, dan `vl` (Q fase dalam kvar); mapping `vl` didasarkan pada kesesuaian jumlah ketiga fase dengan `Zqt` dalam contoh API dan perlu dikonfirmasi terhadap dokumentasi sumber. Data yang dipakai tetap `processedWeight`.

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
- Koneksi MySQL memakai `connectTimeout=5000` ms bila tidak ditentukan di `DATABASE_URL`; parameter URL yang ditentukan sendiri tetap dipakai. Pool tetap melaporkan kegagalan jika server atau jaringan tidak terjangkau.
