import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTagSchema } from "@/types";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateTagSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tag = await prisma.tag.create({ data: parsed.data }).catch((e) => {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    throw e;
  });

  if (tag instanceof NextResponse) return tag;
  return NextResponse.json(tag, { status: 201 });
}
