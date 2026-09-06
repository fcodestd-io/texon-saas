"use client";

import { useActionState, useEffect } from "react";
import { authenticate } from "./action";
import { toast } from "sonner";
import { Lock, User, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  useEffect(() => {
    if (state?.message && !state.errors) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex items-center justify-center p-6 selection:bg-neutral-900 selection:text-neutral-50 dark:selection:bg-neutral-100 dark:selection:text-neutral-950 transition-colors duration-200">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <span className="text-[10px] font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            AUTHENTICATION
          </span>
          <h1 className="text-2xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100">
            Masuk ke Platform
          </h1>
          <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
            Akses panel manajemen konveksi & operasional garment
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Masukkan username"
                disabled={isPending}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors rounded-none"
              />
            </div>
            {state?.errors?.username && (
              <p className="text-[10px] font-light text-red-500 mt-1 font-mono">
                {state.errors.username[0]}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors rounded-none"
              />
            </div>
            {state?.errors?.password && (
              <p className="text-[10px] font-light text-red-500 mt-1 font-mono">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 py-3 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2 rounded-none disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                MEMPROSES...
              </>
            ) : (
              "MASUK KE SISTEM"
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 text-center">
          <p className="text-[11px] font-extralight text-neutral-500">
            Mengalami kendala akun? Hubungi Superadmin SaaS.
          </p>
        </div>
      </div>
    </div>
  );
}
