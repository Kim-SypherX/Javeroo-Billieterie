import { NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/auth/session";
import { storePublicEventPoster } from "@/modules/media/storage";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json(
      { ok: false, error: "Authentification organisateur requise pour téléverser une affiche." },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Aucun fichier image reçu." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stored = await storePublicEventPoster(buffer);

    if (!stored.ok) {
      return NextResponse.json({ ok: false, error: stored.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        imageUrl: stored.publicUrl,
        key: stored.key,
        mime: stored.mime,
        sizeBytes: stored.sizeBytes,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer l'affiche." },
      { status: 500 },
    );
  }
}

