import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role;
  if (userRole !== "superadmin") {
    redirect("/login");
  }

  return (
    <div className="h-screen flex overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-neutral-900 selection:text-neutral-50 dark:selection:bg-neutral-100 dark:selection:text-neutral-950 transition-colors duration-200">
      {/* Impor Komponen Sidebar */}
      <Sidebar
        user={{
          name: session.user.name,
          role: userRole,
          vendorId: (session.user as any).vendorId,
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 shrink-0 border-b border-neutral-200 dark:border-neutral-800/80 px-8 flex items-center justify-between bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-md z-40">
          <span className="text-xs font-extralight tracking-[0.2em] text-neutral-500 uppercase">
            SUPERADMIN PLATFORM CONTROL
          </span>
          <span className="text-[10px] font-extralight text-neutral-400 tracking-widest uppercase border border-neutral-200 dark:border-neutral-800 px-3 py-1">
            NEON DB CONNECTED
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
