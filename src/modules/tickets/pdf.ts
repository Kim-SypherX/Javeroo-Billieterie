import QRCode from "qrcode";
import { formatEventDate, formatEventTime, formatXof } from "@/config/uemoa";
import type { IssuedTicketView } from "@/modules/events/types";

/**
 * Convertit une chaîne UTF-8 française en séquence PDF WinAnsiEncoding (Latin-1 étendu)
 * pour un rendu impeccable des accents (é, è, ê, à, ç, ô, ù, î, É, À...) sans police externe.
 */
export function encodePdfWinAnsi(input: string): string {
  const normalized = input
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...");

  let out = "";
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += "\\" + normalized[i];
    } else if (code >= 0x20 && code <= 0x7e) {
      out += normalized[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += "\\" + code.toString(8).padStart(3, "0");
    } else if (code === 0x20ac) {
      out += "\\200"; // € en WinAnsi
    } else if (code === 0x0153) {
      out += "\\234"; // œ
    } else if (code === 0x0152) {
      out += "\\214"; // Œ
    } else {
      out += " ";
    }
  }
  return out;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawText(
  x: number,
  y: number,
  text: string,
  opts: { font?: "F1" | "F2" | "F3"; size?: number; rgb?: [number, number, number] } = {},
): string {
  const font = opts.font ?? "F1";
  const size = opts.size ?? 11;
  const [r, g, b] = opts.rgb ?? [0.11, 0.16, 0.29];
  return `BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${encodePdfWinAnsi(text)}) Tj ET\n`;
}

function drawRect(
  x: number,
  y: number,
  w: number,
  h: number,
  fillRgb: [number, number, number],
  strokeRgb?: [number, number, number],
): string {
  const [r, g, b] = fillRgb;
  let cmd = `q ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg `;
  if (strokeRgb) {
    cmd += `${strokeRgb[0].toFixed(3)} ${strokeRgb[1].toFixed(3)} ${strokeRgb[2].toFixed(3)} RG 0.8 w `;
    cmd += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B Q\n`;
  } else {
    cmd += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f Q\n`;
  }
  return cmd;
}

function drawVectorQr(payload: string, x: number, yBottom: number, boxSize: number): string {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const cell = boxSize / count;
  let cmds = "q 0.106 0.165 0.290 rg\n"; // Bleu nuit #1B2A4A
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) {
        const rx = x + col * cell;
        const ry = yBottom + (count - 1 - row) * cell;
        cmds += `${rx.toFixed(2)} ${ry.toFixed(2)} ${(cell + 0.15).toFixed(2)} ${(cell + 0.15).toFixed(2)} re f\n`;
      }
    }
  }
  cmds += "Q\n";
  return cmds;
}

function buildTicketPageStream(
  ticket: IssuedTicketView,
  orderRef: string,
  index: number,
  total: number,
): string {
  // Format A4 portrait : 595.28 x 841.89 pt
  const NAVY: [number, number, number] = [0.106, 0.165, 0.29]; // #1B2A4A
  const TEAL: [number, number, number] = [0.055, 0.647, 0.643]; // #0EA5A4
  const LIGHT: [number, number, number] = [0.973, 0.98, 0.988]; // #F8FAFC
  const WHITE: [number, number, number] = [1, 1, 1];
  const BORDER: [number, number, number] = [0.8, 0.835, 0.882];
  const MUTED: [number, number, number] = [0.392, 0.455, 0.545];
  const DARK: [number, number, number] = [0.059, 0.09, 0.165];

  let s = "";

  // Fond carte principale
  s += drawRect(42, 230, 511, 565, WHITE, BORDER);

  // Bandeau supérieur Bleu Nuit + filet Turquoise
  s += drawRect(42, 685, 511, 110, NAVY);
  s += drawRect(42, 680, 511, 5, TEAL);

  // Marque & référence billet
  s += drawText(66, 764, "JAVEROO-BILLETERIE  -  BILLET OFFICIEL", {
    font: "F2",
    size: 10,
    rgb: [0.369, 0.918, 0.831],
  });
  s += drawText(420, 764, `Billet ${index + 1} / ${total}`, {
    font: "F2",
    size: 10,
    rgb: WHITE,
  });

  // Titre événement (retour ligne auto jusqu'à 2 lignes)
  const titleLines = wrapText(ticket.eventTitle, 42).slice(0, 2);
  titleLines.forEach((line, i) => {
    s += drawText(66, 732 - i * 24, line, { font: "F2", size: 18, rgb: WHITE });
  });

  // Zone infos gauche + QR vectoriel droite
  const dateStr = `${formatEventDate(ticket.eventStartsAt)} à ${formatEventTime(ticket.eventStartsAt)}`;
  const priceStr = ticket.unitPriceXof === 0 ? "Gratuit" : formatXof(ticket.unitPriceXof);

  // Bloc gauche : détails structurés
  s += drawText(66, 646, "DATE & HEURE", { font: "F2", size: 8.5, rgb: MUTED });
  s += drawText(66, 630, dateStr, { font: "F2", size: 12, rgb: DARK });

  s += drawText(66, 598, "LIEU", { font: "F2", size: 8.5, rgb: MUTED });
  const venueLines = wrapText(`${ticket.eventVenue}, ${ticket.eventCity}`, 36).slice(0, 2);
  venueLines.forEach((l, i) => {
    s += drawText(66, 582 - i * 16, l, { font: "F1", size: 11, rgb: DARK });
  });

  s += drawText(66, 534, "TITULAIRE DU BILLET", { font: "F2", size: 8.5, rgb: MUTED });
  s += drawText(66, 518, ticket.attendeeName, { font: "F2", size: 13, rgb: NAVY });

  s += drawText(66, 486, "CATÉGORIE & TARIF", { font: "F2", size: 8.5, rgb: MUTED });
  s += drawText(66, 470, `${ticket.tierName}  (${priceStr})`, { font: "F2", size: 11.5, rgb: TEAL });

  s += drawText(66, 438, "RÉFÉRENCE COMMANDE", { font: "F2", size: 8.5, rgb: MUTED });
  s += drawText(66, 422, orderRef, { font: "F3", size: 10.5, rgb: DARK });

  // Encadré QR code à droite
  s += drawRect(342, 415, 190, 244, LIGHT, BORDER);
  s += drawRect(356, 476, 162, 162, WHITE, BORDER);
  s += drawVectorQr(ticket.qrPayload, 366, 486, 142);

  s += drawText(365, 454, "CODE DE SECOURS PORTE", { font: "F2", size: 8, rgb: MUTED });
  s += drawText(365, 434, ticket.shortCode, { font: "F3", size: 13, rgb: NAVY });

  // Encadré consignes en bas de la carte
  s += drawRect(66, 258, 466, 128, LIGHT, BORDER);
  s += drawText(82, 364, "CONSIGNES D'ENTRÉE & SÉCURITÉ", {
    font: "F2",
    size: 9.5,
    rgb: NAVY,
  });
  const rules = [
    "- Présentez ce billet sur votre téléphone ou imprimé à l'entrée de l'événement.",
    "- Ce QR code est signé cryptographiquement et strictement à usage unique.",
    "- Tout partage ou duplication bloque l'entrée dès le deuxième passage au contrôle.",
    "- En cas d'écran cassé, communiquez le code court ci-dessus à l'agent d'accueil.",
    "- Vérifiable hors-ligne par les équipes de contrôle Javeroo-Billeterie.",
  ];
  rules.forEach((rule, i) => {
    s += drawText(82, 344 - i * 17, rule, { font: "F1", size: 9, rgb: DARK });
  });

  // Pied de page discret
  s += drawText(
    42,
    205,
    "Javeroo-Billeterie (Zone UEMOA) — Billet émis automatiquement sans frais cachés.",
    { font: "F1", size: 8.5, rgb: MUTED },
  );

  return s;
}

/**
 * Génère un fichier PDF 1.4 multi-pages (1 billet par page A4) avec QR codes vectoriels nets.
 * Zéro dépendance binaire externe, exécutable en < 5 ms en serverless/Node.
 */
export function generateTicketsPdfBuffer(
  tickets: ReadonlyArray<IssuedTicketView>,
  orderRef: string,
): Buffer {
  if (tickets.length === 0) {
    throw new Error("Au moins un billet est requis pour générer un PDF.");
  }

  // Objets PDF :
  // 1: Catalog, 2: Pages, 3: Helvetica (F1), 4: Helvetica-Bold (F2), 5: Courier-Bold (F3)
  // Pour chaque page i : (6 + 2*i) = Page, (7 + 2*i) = Content stream
  const objects: string[] = [];

  const pageObjectIds = tickets.map((_, i) => 6 + i * 2);

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${tickets.length} >>\nendobj\n`,
  );
  objects.push(
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  tickets.forEach((ticket, i) => {
    const pageId = 6 + i * 2;
    const contentId = pageId + 1;
    const stream = buildTicketPageStream(ticket, orderRef, i, tickets.length);
    const streamByteLen = Buffer.byteLength(stream, "latin1");

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamByteLen} >>\nstream\n${stream}endstream\nendobj\n`,
    );
  });

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets: number[] = [0];
  let currentOffset = chunks[0]!.length;

  for (const obj of objects) {
    offsets.push(currentOffset);
    const buf = Buffer.from(obj, "latin1");
    chunks.push(buf);
    currentOffset += buf.length;
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(chunks);
}
