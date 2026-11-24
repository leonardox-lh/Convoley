import type { EmailSender } from "../application/ports";

const RESEND_URL = "https://api.resend.com/emails";

/** Sends through Resend's HTTP API; a plain fetch, so no SDK dependency. */
export function resendEmailSender(options: { apiKey: string; from: string }): EmailSender {
  return {
    async sendPasswordReset({ to, link }) {
      const response = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: options.from,
          to,
          subject: "Recupera tu contraseña de Convoley",
          text: `Para crear una nueva contraseña entra a este link (vence en 1 hora):\n\n${link}\n\nSi no lo pediste, ignora este correo.`,
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend rejected the email: ${response.status} ${await response.text()}`);
      }
    },
  };
}

/** Local development without an email key: prints the link in the server console instead. */
export const consoleEmailSender: EmailSender = {
  async sendPasswordReset({ to, link }) {
    console.info(`[dev] Password reset link for ${to}: ${link}`);
  },
};
