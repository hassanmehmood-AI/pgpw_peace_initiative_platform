import nodemailer from "nodemailer";
import { APP_NAME, SUPPORT_EMAIL } from "./site";

export type ContactPayload = { name: string; email: string; message: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Collapse CR/LF so user input can never inject extra email headers.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/**
 * Emails a Contact Us submission to the shared support inbox, tagged with the app name
 * in the subject. Returns false (never throws) when SMTP is not configured or sending fails,
 * so the submission itself is never lost.
 */
export async function sendContactEmail({ name, email, message }: ContactPayload): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_TO_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[contact] SMTP not configured — skipping email notification");
    return false;
  }

  const port = Number(SMTP_PORT ?? 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const safeName = oneLine(name);
  const safeEmail = oneLine(email);
  try {
    await transporter.sendMail({
      from: SMTP_FROM || `${APP_NAME} <${SMTP_USER}>`,
      to: CONTACT_TO_EMAIL || SUPPORT_EMAIL,
      replyTo: safeEmail,
      subject: `[${APP_NAME}] New message from ${safeName}`,
      text: `App: ${APP_NAME}\nName: ${safeName}\nEmail: ${safeEmail}\n\n${message}`,
      html: `<p><strong>App:</strong> ${APP_NAME}<br><strong>Name:</strong> ${escapeHtml(safeName)}<br><strong>Email:</strong> ${escapeHtml(safeEmail)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    });
    return true;
  } catch (err) {
    console.error("[contact] failed to send email", err);
    return false;
  }
}
