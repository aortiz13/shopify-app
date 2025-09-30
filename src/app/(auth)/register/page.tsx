"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChangeEvent, FormEvent, useState } from "react";

async function registerUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  password: string;
}) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "No se pudo registrar");
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    whatsapp: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await registerUser(form);
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push(result?.url ?? callbackUrl);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No se pudo registrar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Crea tu cuenta</h1>
          <p className="text-sm text-slate-600">
            Regístrate para guardar tus looks y activar el probador virtual.
          </p>
        </div>
        <form className="grid grid-cols-1 gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="firstName">
              Nombre
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="Tu nombre"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="lastName">
              Apellido
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="Tu apellido"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="tu@correo.com"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="whatsapp">
              Whatsapp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              required
              value={form.whatsapp}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="+54 9 11 1234 5678"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring"
              placeholder="********"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">
          ¿Ya tienes cuenta? {" "}
          <Link
            className="font-medium text-slate-900 underline"
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
