import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import { signOutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:p-8">
        <aside className="w-full rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-8 lg:h-fit lg:w-72">
          <div className="mb-4 border-b border-slate-200 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-700">
              Product
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-950">
              JobFit Copilot
            </h1>
            <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
          </div>

          <SidebarNav />
        </aside>

        <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Protected Dashboard
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Welcome back
              </h2>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
              >
                Sign out
              </button>
            </form>
          </header>

          {children}
        </section>
      </div>
    </div>
  );
}
