"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-900 selection:text-neutral-50 dark:selection:bg-neutral-100 dark:selection:text-neutral-950 transition-colors duration-200">
      {/* Navbar Dinamis */}
      <Navbar variant="landing" />

      <main>
        {/* Hero Section */}
        <section className="py-28 px-6 border-b border-neutral-200 dark:border-neutral-800/80">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 space-y-8">
              <p className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
                Sistem Operasional Garment & Konveksi
              </p>
              <h1 className="text-4xl sm:text-6xl font-extralight leading-[1.1] tracking-tight text-neutral-900 dark:text-neutral-100">
                Presisi inventaris, kalkulasi HPP, dan manajemen SDM produksi
                dalam satu arsitektur terpadu.
              </h1>
            </div>

            <div className="lg:col-span-4 space-y-6 lg:pl-8 border-l-0 lg:border-l border-neutral-200 dark:border-neutral-800/80">
              <p className="text-sm font-light leading-relaxed text-neutral-600 dark:text-neutral-400">
                Texon mengintegrasikan pengelolaan bahan baku mentah, alur kerja
                fisik manufaktur, penggajian berbasis output borongan/harian,
                hingga etalase barang jadi.
              </p>
              <div className="pt-2 flex gap-4">
                <Link
                  href="/login"
                  className="text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-5 py-3 flex items-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors"
                >
                  MEMULAI UJI COBA <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Bar */}
        <section className="border-b border-neutral-200 dark:border-neutral-800/80 py-8 px-6 bg-neutral-100/50 dark:bg-neutral-900/20">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight">
                HPP Real-Time
              </p>
              <p className="text-xs font-extralight text-neutral-500 uppercase tracking-widest">
                Kalkulasi Otomatis SPK
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight">
                Payroll Borongan
              </p>
              <p className="text-xs font-extralight text-neutral-500 uppercase tracking-widest">
                Hitungan Per Pcs / Potong
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight">
                Kinerja Operator
              </p>
              <p className="text-xs font-extralight text-neutral-500 uppercase tracking-widest">
                Matriks Produksi SDM
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight">
                Multi-Satuan
              </p>
              <p className="text-xs font-extralight text-neutral-500 uppercase tracking-widest">
                Konversi Roll, Kg, Yard
              </p>
            </div>
          </div>
        </section>

        {/* 3 Core Modules */}
        <section
          id="modul"
          className="py-24 px-6 border-b border-neutral-200 dark:border-neutral-800/80"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 pb-8 border-b border-neutral-200 dark:border-neutral-800/80">
              <div>
                <span className="text-xs font-extralight tracking-[0.2em] text-neutral-500 uppercase">
                  ARSITEKTUR MODUL
                </span>
                <h2 className="text-2xl sm:text-3xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight mt-2">
                  Struktur Operasional Terintegrasi
                </h2>
              </div>
              <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 max-w-sm leading-relaxed">
                Tiga pilar utama untuk mengendalikan alur bahan baku, efisiensi
                tenaga kerja, dan distribusi produk akhir.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Modul 1 */}
              <div className="space-y-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="text-xs font-extralight text-neutral-500 tracking-widest uppercase">
                    01 / GUDANG & MASTER DATA
                  </div>
                  <h3 className="text-xl font-light text-neutral-900 dark:text-neutral-100 tracking-tight">
                    Stok Bahan & Master Data HPP
                  </h3>
                  <p className="text-sm font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Pusat kontrol inventaris kain, aksesoris, serta riwayat
                    Purchase Order (PO) yang memetakan penggunaan bahan secara
                    presisi ke nilai modal produk.
                  </p>
                  <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/60 text-xs font-light text-neutral-700 dark:text-neutral-300">
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>Kalkulasi HPP otomatis per artikel pesanan.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        Konversi multi-satuan bahan baku (Kg, Roll, Yard).
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        Pencatatan Purchase Order (PO) dan log supplier.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modul 2 */}
              <div
                id="hris"
                className="space-y-8 flex flex-col justify-between lg:border-x border-neutral-200 dark:border-neutral-800/80 lg:px-8"
              >
                <div className="space-y-6">
                  <div className="text-xs font-extralight text-neutral-500 dark:text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                    <span>02 / PRODUKSI, HRIS & ANALYTICS</span>
                  </div>
                  <h3 className="text-xl font-light text-neutral-900 dark:text-neutral-100 tracking-tight">
                    Tahapan Produksi, Penggajian & Kinerja SDM
                  </h3>
                  <p className="text-sm font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Pengendalian alur kerja fisik (Cutting, Sewing, Overdeck,
                    Finishing) yang terhubung langsung ke sistem payroll tenaga
                    kerja borongan/harian serta analisis produktivitas SDM.
                  </p>
                  <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/60 text-xs font-light text-neutral-700 dark:text-neutral-300">
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Tracking Alur Fisik:</strong> Monitoring
                        bertahap Cutting, Sewing, Overdeck, QC, & Finishing.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>HRIS Payroll Borongan & Harian:</strong>{" "}
                        Perhitungan gaji otomatis berdasar target output per
                        pcs, tarif potong/jahit, atau presensi harian.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Analisis Kinerja & Performa SDM:</strong> Metrik
                        efisiensi kerja penjahit/operator, output per jam, dan
                        tingkat produk cacat (reject rate).
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modul 3 */}
              <div className="space-y-8 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="text-xs font-extralight text-neutral-500 tracking-widest uppercase">
                    03 / INVENTARIS PRODUK JADI
                  </div>
                  <h3 className="text-xl font-light text-neutral-900 dark:text-neutral-100 tracking-tight">
                    Etalase Barang Jadi & Packing
                  </h3>
                  <p className="text-sm font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Sistem inventarisasi pakaian jadi siap edar, pencatatan
                    mutasi barang keluar-masuk, pengelompokan bal packing, serta
                    pencetakan label barcode.
                  </p>
                  <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/60 text-xs font-light text-neutral-700 dark:text-neutral-300">
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        Log mutasi produk masuk dari produksi & keluar gudang.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        Manajemen packing bal & pengelompokan per pesanan.
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        Verifikasi stok produk jadi menggunakan scanner webcam.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Capabilities */}
        <section
          id="fitur"
          className="py-24 px-6 border-b border-neutral-200 dark:border-neutral-800/80"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="space-y-2">
              <span className="text-xs font-extralight tracking-[0.2em] text-neutral-500 uppercase">
                SPESIFIKASI FITUR
              </span>
              <h2 className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight">
                Kapabilitas Teknis Platform
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
                <span className="text-xs font-extralight text-neutral-500 uppercase">
                  01. EXPEDITED EXPORT
                </span>
                <h4 className="text-base font-light text-neutral-900 dark:text-neutral-100">
                  Ekspor Data XLSX & PDF
                </h4>
                <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Ekspor rekapan stok, slip gaji borongan, dan laporan HPP ke
                  format Spreadsheet atau dokumen PDF siap cetak.
                </p>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
                <span className="text-xs font-extralight text-neutral-500 uppercase">
                  02. WORKFORCE ANALYTICS
                </span>
                <h4 className="text-base font-light text-neutral-900 dark:text-neutral-100">
                  Matriks Produktivitas Tim
                </h4>
                <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Visualisasi performa penjahit dan operator secara individual
                  maupun tim untuk mengidentifikasi bottleneck produksi.
                </p>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
                <span className="text-xs font-extralight text-neutral-500 uppercase">
                  03. SMART INPUT
                </span>
                <h4 className="text-base font-light text-neutral-900 dark:text-neutral-100">
                  Webcam Scanner Native
                </h4>
                <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Pemindaian barcode barang dan manifest packing secara instan
                  memanfaatkan kamera webcam standar.
                </p>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
                <span className="text-xs font-extralight text-neutral-500 uppercase">
                  04. COST ACCURACY
                </span>
                <h4 className="text-base font-light text-neutral-900 dark:text-neutral-100">
                  Alokasi Ongkos Kerja
                </h4>
                <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Penyerapan beban gaji borongan potong dan jahit langsung ke
                  struktur HPP akhir setiap produk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="harga"
          className="py-24 px-6 border-b border-neutral-200 dark:border-neutral-800/80"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
              <div>
                <span className="text-xs font-extralight tracking-[0.2em] text-neutral-500 uppercase">
                  LISENSI BERLANGGANAN
                </span>
                <h2 className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 tracking-tight mt-2">
                  Struktur Paket SaaS
                </h2>
              </div>
              <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 max-w-sm">
                Transparan tanpa biaya tersembunyi. Disesuaikan dengan kapasitas
                lini produksi konveksi Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="border border-neutral-200 dark:border-neutral-800/80 p-8 space-y-8 flex flex-col justify-between bg-white dark:bg-transparent">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-light text-neutral-900 dark:text-neutral-100">
                      Starter
                    </h3>
                    <p className="text-xs font-light text-neutral-500">
                      Skala operasional konveksi kecil.
                    </p>
                  </div>
                  <div>
                    <span className="text-3xl font-extralight text-neutral-900 dark:text-neutral-100">
                      Rp 299.000
                    </span>
                    <span className="text-xs font-extralight text-neutral-500">
                      {" "}
                      / bulan
                    </span>
                  </div>
                  <div className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800/60 text-xs font-light text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-200" />
                      <span>Maksimal 3 User Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-200" />
                      <span>Modul 1: Stok & HPP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-200" />
                      <span>Modul 2: Produksi & HRIS Dasar</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="w-full text-center text-xs font-light tracking-wider border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 text-neutral-900 dark:text-neutral-100 py-3 transition-colors"
                >
                  PILIH STARTER
                </Link>
              </div>

              {/* Professional */}
              <div className="border border-neutral-900 dark:border-neutral-100 p-8 space-y-8 flex flex-col justify-between bg-neutral-100/60 dark:bg-neutral-900/30 relative">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-lg font-light text-neutral-900 dark:text-neutral-100">
                        Professional
                      </h3>
                      <p className="text-xs font-light text-neutral-600 dark:text-neutral-400">
                        Pabrik konveksi kapasitas harian aktif.
                      </p>
                    </div>
                    <span className="text-[10px] font-extralight tracking-widest text-neutral-50 dark:text-neutral-950 bg-neutral-900 dark:bg-neutral-100 px-2 py-0.5 uppercase">
                      REKOMENDASI
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extralight text-neutral-900 dark:text-neutral-100">
                      Rp 699.000
                    </span>
                    <span className="text-xs font-extralight text-neutral-500">
                      {" "}
                      / bulan
                    </span>
                  </div>
                  <div className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800/60 text-xs font-light text-neutral-700 dark:text-neutral-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
                      <span>User Unlimited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
                      <span>Semua Modul Terintegrasi Full</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
                      <span>HRIS Payroll Borongan & Analytics SDM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
                      <span>Scanner Webcam & Ekspor Excel/PDF</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="w-full text-center text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 py-3 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors"
                >
                  PILIH PROFESSIONAL
                </Link>
              </div>

              {/* Enterprise */}
              <div className="border border-neutral-200 dark:border-neutral-800/80 p-8 space-y-8 flex flex-col justify-between bg-white dark:bg-transparent">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-light text-neutral-900 dark:text-neutral-100">
                      Enterprise
                    </h3>
                    <p className="text-xs font-light text-neutral-500">
                      Manufaktur garment skala besar.
                    </p>
                  </div>
                  <div>
                    <span className="text-3xl font-extralight text-neutral-900 dark:text-neutral-100">
                      Custom
                    </span>
                  </div>
                  <div className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800/60 text-xs font-light text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-200" />
                      <span>Dedicated Neon Database Instance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-200" />
                      <span>Kustom Alur Workstation & Payroll</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-200" />
                      <span>Dukungan Teknis Prioritas</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="w-full text-center text-xs font-light tracking-wider border border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 text-neutral-900 dark:text-neutral-100 py-3 transition-colors"
                >
                  HUBUNGI TIM
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Dinamis */}
      <Footer variant="full" />
    </div>
  );
}
