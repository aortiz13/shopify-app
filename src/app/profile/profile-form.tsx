"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChangeEvent, FormEvent, useState } from "react";

type ProfileFormProps = {
  user: {
    firstName: string | null;
    lastName: string | null;
    whatsapp: string | null;
    email: string;
  };
};

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    whatsapp: user.whatsapp ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completeFlag = searchParams.get("complete");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      setMessage("Datos guardados correctamente.");
      await update();
      if (completeFlag) {
        router.push("/");
      } else {
        router.refresh();
      }
    } else {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "No se pudo guardar la información");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Tu perfil</h1>
          <p className="text-sm text-slate-600">
            Completa tus datos para seguir usando el probador virtual.
          </p>
          <p className="text-xs text-slate-500">Correo registrado: {user.email}</p>
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
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-emerald-600" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">
          ¿Necesitas ayuda? {" "}
          <Link className="font-medium text-slate-900 underline" href="mailto:soporte@tuapp.com">
            Contáctanos
          </Link>
        </p>
      </div>
    </div>
  );
}
