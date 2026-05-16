import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UnsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = UnsubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.subscription
    .delete({ where: { endpoint: parsed.data.endpoint } })
    .catch(() => null);

  return new NextResponse(null, { status: 204 });
}
