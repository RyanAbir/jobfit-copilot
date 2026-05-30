import Link from "next/link";
import { redirect } from "next/navigation";
import SignUpForm from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function SignUpPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-8">
          <Link
            href="/"
            className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            Create your JobFit Copilot account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign up to start analyzing jobs and tracking your applications.
          </p>

          <div className="mt-6">
            <SignUpForm />
          </div>
        </section>
      </div>
    </main>
  );
}
