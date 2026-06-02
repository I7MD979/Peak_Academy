import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) return { skipped: true };
  return resend.emails.send({
    from: "Peak Academy <noreply@peak-academy.net>",
    to,
    subject,
    html
  });
};
