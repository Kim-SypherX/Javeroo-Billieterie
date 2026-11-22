import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAndCheckinTicket } from "@/modules/events/store";

const checkinSchema = z.object({
  codeOrPayload: z.string().trim().min(3, "Saisissez un code ou scannez un QR code."),
  expectedEventId: z.string().min(1),
  gateLabel: z.string().trim().min(1).max(100).default("Entrée Principale"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "INVALID", message: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 },
      );
    }

    const outcome = validateAndCheckinTicket(parsed.data);
    return NextResponse.json(outcome);
  } catch {
    return NextResponse.json(
      { status: "INVALID", message: "Erreur de vérification du billet." },
      { status: 500 },
    );
  }
}

