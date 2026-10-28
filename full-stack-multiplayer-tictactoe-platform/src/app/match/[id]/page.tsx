"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function MatchRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/?match=${encodeURIComponent(String(params.id || ""))}`);
  }, [params.id, router]);
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center"><div className="text-4xl animate-bounce">⚔️</div><div className="mt-2 font-bold">Loading match...</div></div>
    </div>
  );
}
