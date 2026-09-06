import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Texon - Platform Software & SaaS Manajemen Konveksi & Garment",
    template: "%s | Texon SaaS Garment",
  },
  description:
    "Sistem Operasional Konveksi Terintegrasi: Stok Bahan Baku, Kalkulasi HPP, Tracking Produksi (Potong/Sewing/Finishing), HRIS Penggajian Borongan & Harian, Analytics Kinerja SDM, hingga Packing Bal.",
  keywords: [
    "SaaS Konveksi",
    "Software Garment",
    "Aplikasi Pabrik Tekstil",
    "Sistem Inventoris Kain",
    "Hitung HPP Konveksi",
    "Tracking SPK Produksi",
    "Manajemen Gudang Tekstil",
    "HRIS Garment",
    "Penggajian Borongan Konveksi",
    "Performa SDM Penjahit",
  ],
  authors: [{ name: "Texon Team" }],
  openGraph: {
    title: "Texon - Smart Garment & Confection Management SaaS",
    description:
      "Digitalisasi operasional konveksi dari bahan mentah, alur produksi, penggajian borongan/harian, hingga barang jadi secara akurat.",
    url: "https://garment-saas-texon.vercel.app",
    siteName: "Texon SaaS",
    locale: "id_ID",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={jakartaSans.variable}>
      <body className="font-sans antialiased bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-neutral-50 dark:selection:bg-neutral-100 dark:selection:text-neutral-950 transition-colors duration-200">
        <ThemeProvider >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
