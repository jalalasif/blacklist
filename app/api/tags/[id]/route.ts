import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateTagSchema } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateTagSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tag = await prisma.tag
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);

  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tag);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.tag.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
