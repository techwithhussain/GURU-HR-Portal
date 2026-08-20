"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { loginAction, type LoginFormState } from "@/actions/auth.actions";
import { Label } from "@/components/ui/label";

const initialState: LoginFormState = {};

// Desktop agent exposes a tiny local HTTP server on port 47800.
// Silently fetch PC hostname to bind HR Portal session to the correct PC.
async function fetchPcName(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const r = await fetch("http://localhost:47800/pcname", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (r.ok) {
      const data = (await r.json()) as { pcName?: string };
      return data.pcName ?? "";
    }
  } catch {
    // Agent not running or browser blocked request — login works normally
  }
  clearTimeout(timer);
  return "";
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const pcNameRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    fetchPcName().then((name) => {
      if (pcNameRef.current) pcNameRef.current.value = name;
    });
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <input ref={pcNameRef} type="hidden" name="pcName" defaultValue="" />

      {/* Employee ID Field */}
      <div className="space-y-1.5">
        <Label
          htmlFor="employeeCode"
          className="text-xs font-bold text-slate-800 tracking-tight"
        >
          Employee ID
        </Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <User className="size-4.5" />
          </div>
          <input
            id="employeeCode"
            name="employeeCode"
            type="text"
            autoComplete="username"
            required
            placeholder="Enter your employee ID"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-[#FF5C00] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-xs font-bold text-slate-800 tracking-tight"
        >
          Password
        </Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Lock className="size-4.5" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-[#FF5C00] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex cursor-pointer select-none items-center gap-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={rememberMe}
            onClick={() => setRememberMe((prev) => !prev)}
            className={`flex size-4 items-center justify-center rounded transition-colors ${
              rememberMe
                ? "bg-[#FF5C00] text-white"
                : "border border-slate-300 bg-white"
            }`}
          >
            {rememberMe && <Check className="size-3 stroke-[3]" />}
          </button>
          <span className="text-xs font-medium text-slate-700">Remember me</span>
        </label>
        <Link
          href="/forgot-password"
          className="text-xs font-semibold text-[#FF5C00] transition-colors hover:text-[#E04F00] hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {/* Error Message */}
      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs font-medium text-red-700 animate-in fade-in duration-200"
        >
          <AlertCircle className="size-4 shrink-0 text-red-600" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Sign In CTA Button */}
      <button
        type="submit"
        disabled={pending}
        className="group relative flex h-11.5 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5C00] via-[#FF5500] to-[#E04800] px-4 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:from-[#FF6B1A] hover:to-[#E04F00] hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <span>Sign in</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      {/* Divider */}
      <div className="relative my-3 pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400">
          <span className="bg-white px-3 font-medium">or</span>
        </div>
      </div>

      {/* Security Information Card */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:bg-slate-50">
        <div className="flex size-7.5 shrink-0 items-center justify-center rounded-full bg-orange-100/70 text-[#FF5C00]">
          <ShieldCheck className="size-4.5" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-slate-800 leading-tight">Secure Login</p>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
            Your data is protected with end-to-end encryption
          </p>
        </div>
      </div>
    </form>
  );
}
