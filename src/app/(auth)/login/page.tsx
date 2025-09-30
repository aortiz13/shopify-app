"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders()
      .then((providers) => {
        setGoogleEnabled(Boolean(providers?.google));
      })
      .catch(() => {
        setGoogleEnabled(false);
      });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (response?.error) {
      setError(response.error);
      return;
    }

    router.push(response?.url ?? callbackUrl);
  };

  const handleGoogle = () => {
    void signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Ingresa a tu cuenta</h1>
          <p className="text-sm text-slate-600">
            Accede para utilizar el probador virtual en tus productos.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="tu@correo.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="********"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {errorParam && !error && (
            <p className="text-sm text-red-600" role="alert">
              {errorParam === "OAuthAccountNotLinked"
                ? "Debes iniciar sesión con el mismo método usado anteriormente."
                : "No se pudo iniciar sesión."}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        {googleEnabled && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg
                aria-hidden
                className="h-5 w-5"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-2 3l3.1 2.4c1.8-1.7 2.8-4.2 2.8-7 0-.7-.1-1.3-.2-2H12z"
                />
                <path
                  fill="#34A853"
                  d="M6.5 14.3l-.9.7-2.5 2c1.8 3.6 5.5 6 9.9 6 3 0 5.5-1 7.3-2.7l-3.1-2.4c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.7-5.6-4z"
                />
                <path
                  fill="#4A90E2"
                  d="M21.8 6.5c-.3-.9-.8-1.8-1.4-2.5L17.3 6c.6.6 1.1 1.4 1.3 2.3.3 1 .3 2 .1 2.9H12V6.3h4.9c1-.9 1.7-2 1.9-3.2z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.1 6.5C2.4 8 2 9.7 2 11.5s.4 3.5 1.1 5l3.4-2.7c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2l-3.4-2.7z"
                />
              </svg>
              Ingresar con Google
            </button>
          </div>
        )}
        <p className="text-center text-sm text-slate-600">
          ¿No tienes cuenta? {" "}
          <Link
            className="font-medium text-slate-900 underline"
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
