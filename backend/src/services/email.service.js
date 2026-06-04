import { Resend } from "resend";

let resend = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export const sendEmail = async ({ to, subject, html }) => {
  const client = getResendClient();
  if (!client) return { skipped: true };

  return client.emails.send({
    from: "Peak Academy <noreply@peak-academy.net>",
    to,
    subject,
    html
  });
};
