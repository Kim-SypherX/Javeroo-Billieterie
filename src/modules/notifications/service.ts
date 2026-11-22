import { SITE_CONFIG } from "@/config/site";
import { formatXof } from "@/config/uemoa";
import type { OrderView } from "@/modules/events/types";

export interface NotificationDeliveryLog {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  recipient: string;
  status: "SENT" | "QUEUED_DEV_LOG" | "FAILED";
  provider: string;
  summary: string;
  createdAt: string;
}

declare global {
  var __javerooNotifLogs: NotificationDeliveryLog[] | undefined;
}

function getNotifLogs(): NotificationDeliveryLog[] {
  if (!globalThis.__javerooNotifLogs) {
    globalThis.__javerooNotifLogs = [];
  }
  return globalThis.__javerooNotifLogs;
}

export function listRecentNotificationLogs(limit = 20): NotificationDeliveryLog[] {
  return getNotifLogs().slice(0, limit);
}

/**
 * Envoie les confirmations de commande par E-mail (Resend API si configurée)
 * et WhatsApp Cloud API (Meta Graph si configurée), avec journalisation non bloquante en dev.
 */
export async function dispatchOrderTicketNotifications(order: OrderView): Promise<void> {
  const ticketUrl = `${SITE_CONFIG.baseUrl}/commandes/${order.publicToken}`;
  const pdfUrl = `${SITE_CONFIG.baseUrl}/api/orders/${order.publicToken}/pdf`;
  const logs = getNotifLogs();
  const nowIso = new Date().toISOString();

  // 1. WhatsApp / SMS (canal prioritaire UEMOA)
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (waToken && waPhoneId) {
    try {
      const to = order.buyerPhone.replace(/[^0-9]/g, "");
      const res = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            body: `Bonjour ${order.buyerName}, vos ${order.tickets.length} billet(s) pour ${order.eventTitle} sont prêts ! Code : ${order.tickets[0]?.shortCode ?? ""}. Lien : ${ticketUrl}`,
          },
        }),
      });
      logs.unshift({
        id: `ntf-wa-${Date.now()}`,
        channel: "WHATSAPP",
        recipient: order.buyerPhone,
        status: res.ok ? "SENT" : "FAILED",
        provider: "whatsapp-cloud-api",
        summary: `${order.tickets.length} billet(s) pour ${order.eventTitle}`,
        createdAt: nowIso,
      });
    } catch {
      logs.unshift({
        id: `ntf-wa-${Date.now()}`,
        channel: "WHATSAPP",
        recipient: order.buyerPhone,
        status: "FAILED",
        provider: "whatsapp-cloud-api",
        summary: `Échec réseau WhatsApp (${order.publicToken})`,
        createdAt: nowIso,
      });
    }
  } else {
    logs.unshift({
      id: `ntf-wa-${Date.now()}`,
      channel: "WHATSAPP",
      recipient: order.buyerPhone,
      status: "QUEUED_DEV_LOG",
      provider: "dev-console",
      summary: `Billet(s) ${order.tickets.map((t) => t.shortCode).join(", ")} -> ${ticketUrl}`,
      createdAt: nowIso,
    });
  }

  // 2. E-mail (Resend API si configurée et adresse renseignée)
  if (order.buyerEmail) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? "Javeroo Billetterie <billets@javeroo.com>",
            to: [order.buyerEmail],
            subject: `Vos billets : ${order.eventTitle} (${order.publicToken})`,
            html: `<p>Bonjour ${order.buyerName},</p><p>Merci pour votre commande (${order.totalToPayXof === 0 ? "Gratuit" : formatXof(order.totalToPayXof)}).</p><p><a href="${ticketUrl}">Afficher vos QR codes</a> · <a href="${pdfUrl}">Télécharger le PDF</a></p>`,
          }),
        });
        logs.unshift({
          id: `ntf-em-${Date.now()}`,
          channel: "EMAIL",
          recipient: order.buyerEmail,
          status: res.ok ? "SENT" : "FAILED",
          provider: "resend",
          summary: `Confirmation + lien PDF (${order.publicToken})`,
          createdAt: nowIso,
        });
      } catch {
        logs.unshift({
          id: `ntf-em-${Date.now()}`,
          channel: "EMAIL",
          recipient: order.buyerEmail,
          status: "FAILED",
          provider: "resend",
          summary: `Échec réseau Resend (${order.publicToken})`,
          createdAt: nowIso,
        });
      }
    } else {
      logs.unshift({
        id: `ntf-em-${Date.now()}`,
        channel: "EMAIL",
        recipient: order.buyerEmail,
        status: "QUEUED_DEV_LOG",
        provider: "dev-console",
        summary: `PDF prêt sur ${pdfUrl}`,
        createdAt: nowIso,
      });
    }
  }
}

