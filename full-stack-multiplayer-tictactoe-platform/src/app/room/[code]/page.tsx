"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RoomRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/?room=${encodeURIComponent(String(params.code || "").toUpperCase())}`);
  }, [params.code, router]);
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center"><div className="text-4xl animate-bounce">👥</div><div className="mt-2 font-bold">Joining room {String(params.code).toUpperCase()}...</div></div>
    </div>
  );
}
