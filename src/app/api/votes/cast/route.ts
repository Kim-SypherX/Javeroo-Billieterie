import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildUpdatedVoteTransactionsCookie,
  hydrateVotesIntoStore,
} from "@/modules/votes/cookie-store";
import { castCandidateVotes } from "@/modules/votes/store";

const castVoteSchema = z.object({
  campaignId: z.string().min(1),
  candidateId: z.string().min(1),
  votesCount: z.number().int().min(1, "Sélectionnez au moins 1 voix.").max(2000),
  voterName: z.string().trim().max(120).optional(),
  voterPhone: z
    .string()
    .trim()
    .min(8, "Indiquez un numéro Mobile Money / WhatsApp valide.")
    .max(32),
  paymentMethod: z.enum([
    "ORANGE_MONEY",
    "WAVE",
    "MOOV_MONEY",
    "MTN_MOMO",
    "MIXX_TMONEY",
    "CARD",
  ]),
});

export async function POST(request: Request) {
  try {
    await hydrateVotesIntoStore();
    const body = await request.json();
    const parsed = castVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Données de vote invalides." },
        { status: 400 },
      );
    }

    const result = await castCandidateVotes(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }

    const txCookie = await buildUpdatedVoteTransactionsCookie(result.transaction);
    const response = NextResponse.json(
      {
        ok: true,
        transaction: result.transaction,
        candidate: result.candidate,
        campaign: result.campaign,
      },
      { status: 201 },
    );
    response.cookies.set(txCookie);
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'enregistrement du vote." },
      { status: 500 },
    );
  }
}

