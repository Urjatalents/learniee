"use client";

import { createContext, useContext, useMemo, useRef } from "react";
import Link from "next/link";

import BrandLogo from "@/features/shared/components/BrandLogo";
import AuthCharacters, { type CastHandle } from "./AuthCharacters";

interface AuthStageApi {
  signalError: () => void;
  signalSuccess: () => void;
}

const AuthStageContext = createContext<AuthStageApi>({
  signalError: () => {},
  signalSuccess: () => {},
});

/** Lets a form make the characters react (sad on error, happy on success). */
export function useAuthStage() {
  return useContext(AuthStageContext);
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const cast = useRef<CastHandle>(null);
  const api = useMemo<AuthStageApi>(
    () => ({
      signalError: () => cast.current?.error(),
      signalSuccess: () => cast.current?.happy(),
    }),
    [],
  );

  return (
    <AuthStageContext.Provider value={api}>
      <main className="grid min-h-screen place-items-start bg-[#f6f3fc] md:place-items-center md:p-5">
        <div className="grid w-full min-h-screen grid-cols-1 overflow-hidden bg-white md:min-h-[560px] md:h-[min(680px,calc(100vh-40px))] md:max-w-[1040px] md:grid-cols-[1.05fr_1fr] md:rounded-[28px] md:shadow-[0_24px_60px_-24px_rgba(91,31,176,0.35)]">
          <section
            className="relative flex h-[230px] flex-col justify-end overflow-hidden bg-[#efe9fb] md:h-auto"
            aria-hidden="true"
          >
            <p className="absolute left-9 right-9 top-8 hidden max-w-[16ch] font-heading text-2xl font-bold leading-tight text-[#5b1fb0] md:block">
              Learn together, one class at a time.
            </p>
            <AuthCharacters ref={cast} />
          </section>

          <section className="flex flex-col overflow-auto px-6 pb-8 pt-6 md:px-12 md:py-8">
            <Link href="/" aria-label="Learniee home" className="mx-auto">
              <BrandLogo className="h-10 w-auto" priority />
            </Link>
            {children}
          </section>
        </div>
      </main>
    </AuthStageContext.Provider>
  );
}
