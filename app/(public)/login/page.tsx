import Image from "next/image";
import { Lock, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F6F9] px-4 py-8 sm:px-6 lg:px-8">
      {/* Centered Main Login Container */}
      <div className="relative w-full max-w-[960px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] grid grid-cols-1 lg:grid-cols-2">
        
        {/* LEFT COLUMN — Branding, Welcome & Visual Presentation */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-50/90 via-orange-50/20 to-slate-100/70 p-8 sm:p-10 border-b border-slate-100 lg:border-b-0 lg:border-r">
          
          {/* Subtle Corner Dot Grid Pattern */}
          <div className="pointer-events-none absolute left-6 top-6 grid grid-cols-5 gap-1.5 opacity-25">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="size-1 rounded-full bg-slate-400" />
            ))}
          </div>

          {/* Faint Background Wave Curve */}
          <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-orange-100/40 blur-3xl" />

          {/* Top Branding Section */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Real GDA Logo */}
            <div className="relative mb-2 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Guru Digital Advertising Logo"
                width={84}
                height={84}
                priority
                className="h-20 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105"
              />
            </div>

            {/* Brand Titles */}
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
              <span className="text-[#FF5C00]">Guru</span> Digital Advertising
            </h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Management Information System
            </p>

            {/* Accent Divider Line */}
            <div className="mt-2.5 h-1 w-12 rounded-full bg-[#FF5C00]" />

            {/* Welcome Heading */}
            <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
              Welcome Back!
            </h2>
            <p className="mt-1 max-w-[260px] text-xs text-slate-500">
              Sign in to access your management dashboard
            </p>
          </div>

          {/* Isometric / 3D-Style UI Illustration Mockup */}
          <div className="relative z-10 mt-6 flex items-center justify-center pt-2">
            <div className="relative w-full max-w-[340px] select-none">
              
              {/* Slanted / Tilted Dashboard Backplate */}
              <div className="relative rounded-2xl border border-slate-200/90 bg-white/90 p-3.5 shadow-xl shadow-slate-200/60 backdrop-blur-sm transform -rotate-1 transition-transform hover:rotate-0 duration-300">
                {/* Header Mockup */}
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-slate-900 flex items-center justify-center">
                      <div className="size-2 rounded-full bg-orange-400" />
                    </div>
                    <div className="h-2 w-12 rounded-full bg-slate-200" />
                  </div>
                  <div className="size-4.5 rounded-full bg-slate-100 border border-slate-200" />
                </div>

                {/* Dashboard Grid Placeholders */}
                <div className="grid grid-cols-2 gap-2 pb-1">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1.5">
                    <div className="h-2 w-14 rounded-full bg-slate-200" />
                    <div className="h-4 w-10 rounded-md bg-slate-300/80" />
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1.5">
                    <div className="h-2 w-12 rounded-full bg-slate-200" />
                    <div className="h-4 w-8 rounded-md bg-slate-300/80" />
                  </div>
                </div>
              </div>

              {/* Floating Orange Card: Secure Access */}
              <div className="absolute -bottom-3 -left-3 rounded-2xl bg-gradient-to-br from-[#FF5C00] to-[#E04800] p-3 text-white shadow-xl shadow-orange-500/30 transform hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/20">
                    <ShieldCheck className="size-4 text-white" />
                  </div>
                  <div className="pr-2">
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Access</p>
                    <p className="text-xs font-extrabold leading-tight">Secure Portal</p>
                  </div>
                </div>
              </div>

              {/* Floating White Card: Protected Data */}
              <div className="absolute -bottom-4 -right-2 rounded-2xl border border-slate-100/90 bg-white/95 p-2.5 shadow-lg shadow-slate-200/80 backdrop-blur-md transform hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-2">
                  <div className="flex size-6.5 items-center justify-center rounded-lg bg-orange-50 text-[#FF5C00]">
                    <Lock className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">Protected</p>
                    <p className="text-[9px] text-slate-400">Always encrypted</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN — Sign In Form Area */}
        <div className="relative flex flex-col justify-center bg-white p-8 sm:p-10 lg:p-12">
          
          {/* Subtle Top-Right Dot Grid */}
          <div className="pointer-events-none absolute right-6 top-6 grid grid-cols-5 gap-1.5 opacity-25">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="size-1 rounded-full bg-slate-400" />
            ))}
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              <span className="text-[#FF5C00]">Sign in</span> to your account
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
              Enter your credentials to continue
            </p>
          </div>

          {/* Interactive Form Component */}
          <LoginForm />

        </div>

      </div>

      {/* Clean Bottom Trust Footer */}
      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock className="size-3.5" />
        <span>
          Your information is <span className="font-semibold text-[#FF5C00]">safe</span> with us
        </span>
      </div>
    </div>
  );
}
