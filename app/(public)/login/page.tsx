import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-primary/20 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Guru Digital Advertising</h1>
          <p className="mt-1 text-sm text-muted-foreground">Employee Management System</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
