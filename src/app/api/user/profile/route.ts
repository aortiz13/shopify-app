import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

function sanitizePhone(input: string) {
  return input.replace(/[^+\d]/g, "");
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? sanitizePhone(body.whatsapp.trim()) : "";

  if (!firstName) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!lastName) {
    return NextResponse.json({ error: "El apellido es obligatorio" }, { status: 400 });
  }
  if (!whatsapp) {
    return NextResponse.json({ error: "El número de Whatsapp es obligatorio" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        whatsapp,
        name: `${firstName} ${lastName}`.trim(),
      },
    });
  } catch (error: unknown) {
    console.error("Error actualizando perfil", error);
    return NextResponse.json({ error: "No se pudo guardar el perfil" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
