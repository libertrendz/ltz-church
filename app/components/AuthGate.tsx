/* PATH: app/components/AuthGate.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);

  const isPublicRoute = (p: string | null) => {
    if (!p) return true;
    // ✅ mantém aqui todas as rotas públicas
    if (p.startsWith("/login")) return true;
    if (p.startsWith("/health")) return true;
    return false;
  };

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;

        const authed = !!data.session;

        if (!authed && !isPublicRoute(pathname)) {
          router.replace("/login");
          return;
        }

        setReady(true);
      } catch {
        if (!active) return;
        if (!isPublicRoute(pathname)) router.replace("/login");
      }
    }

    check();

    // ✅ reage instantaneamente a signout/login
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const authed = !!session;
      if (!authed && !isPublicRoute(pathname)) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  // Rotas públicas não precisam gate/loader
  if (isPublicRoute(pathname)) return <>{children}</>;

  if (!ready) {
    return (
      <main style={{ padding: 16 }}>
        <div style={{ opacity: 0.8 }}>A carregar…</div>
      </main>
    );
  }

  return <>{children}</>;
}
