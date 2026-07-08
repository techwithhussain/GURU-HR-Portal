import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-border/50 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Update your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Required before continuing</p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
