"use client";

import Link from "next/link";

interface FooterProps {
  variant?: "full" | "minimal";
}

export function Footer({ variant = "full" }: FooterProps) {
  return (
    <footer className="py-12 px-6 bg-neutral-50 dark:bg-neutral-950 text-neutral-500 text-xs font-extralight border-t border-neutral-200 dark:border-neutral-800/80">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-light text-neutral-900 dark:text-neutral-100 tracking-widest uppercase">
            TEXON
          </span>
          <span>—</span>
          <span>Garment Management SaaS Platform</span>
        </div>

        <p>© {new Date().getFullYear()} Texon OS. All rights reserved.</p>

        <div className="flex gap-6 text-neutral-600 dark:text-neutral-400">
          <Link
            href="#"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Privasi
          </Link>
          <Link
            href="#"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Ketentuan
          </Link>
          {variant === "full" && (
            <Link
              href="#"
              className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Dokumentasi API
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
