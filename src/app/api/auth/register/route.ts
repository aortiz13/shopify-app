import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

import { prisma } from "@/server/db";

function sanitizePhone(input: string) {
  return input.replace(/[^+\d]/g, "");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const whatsapp = typeof body.whatsapp === "string" ? sanitizePhone(body.whatsapp.trim()) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!firstName) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!lastName) {
    return NextResponse.json({ error: "El apellido es obligatorio" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "El correo no es válido" }, { status: 400 });
  }
  if (!whatsapp) {
    return NextResponse.json({ error: "El número de Whatsapp es obligatorio" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  try {
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          whatsapp,
          passwordHash,
          name: `${firstName} ${lastName}`.trim(),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          whatsapp,
          passwordHash,
          name: `${firstName} ${lastName}`.trim(),
        },
      });
    }
  } catch (error: unknown) {
    console.error("Error creando usuario", error);
    return NextResponse.json({ error: "No se pudo registrar el usuario" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
