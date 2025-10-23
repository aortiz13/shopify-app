"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { TryOnProduct } from "@/types/tryon";

export default function TryOnPopup() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const { data: session, status } = useSession();
  const router = useRouter();

  const [product, setProduct] = useState<TryOnProduct | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    if (productId) {
      // acá iría fetch al backend para obtener info del producto
      setProduct({ id: productId, name: "Producto Ejemplo" });
    }
  }, [productId]);

  useEffect(() => {
    getProviders()
      .then((providers) => {
        setGoogleEnabled(Boolean(providers?.google));
      })
      .catch(() => {
        setGoogleEnabled(false);
      });
  }, []);

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/tryon";
    return window.location.pathname + window.location.search;
  }, []);

  if (status === "loading") {
    return (
      <div className="p-6 bg-white rounded shadow-md text-center">
        <p className="text-sm text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6 bg-white rounded shadow-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Necesitas iniciar sesión</h1>
        <p className="text-sm text-slate-600">
          Crea una cuenta o inicia sesión para usar el probador virtual y guardar tus prendas favoritas.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Iniciar sesión
          </button>
          {googleEnabled && (
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Continuar con Google
            </button>
          )}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-sm font-medium text-slate-900 underline"
          >
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
      </div>
    );
  }

  if (!session?.user?.profileComplete) {
    return (
      <div className="p-6 bg-white rounded shadow-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Completa tu perfil</h1>
        <p className="text-sm text-slate-600">
          Necesitamos tu nombre, apellido y Whatsapp para activar el probador virtual.
        </p>
        <button
          onClick={() => router.push("/profile?complete=1")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Completar mis datos
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow-md">
      <h1 className="text-xl font-bold mb-2">Probador Virtual</h1>
      <p>
        ID del producto: <span className="font-mono">{product?.id}</span>
      </p>
      <p>Nombre: {product?.name}</p>
      <p className="mt-4 text-sm text-slate-600">
        Sesión activa como {session.user.firstName ?? ""} {session.user.lastName ?? ""}.
      </p>
    </div>
  );
}
