import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-primary/20 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
