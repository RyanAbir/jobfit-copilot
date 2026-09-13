import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ResumeLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 print:p-0">
        {children}
      </div>
    </div>
  );
}
