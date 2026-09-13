import { ChildInvitationTemplate } from '@/components/email-templates/child-invitation';
import React from 'react';
import { Resend } from 'resend';

const from = process.env.RESEND_FROM_EMAIL || 'Chore Monster <noreply@c4g.dev>';

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export async function sendChildInvitation({
  childName,
  email,
  inviteToken,
  origin,
  parentName,
}: {
  childName: string;
  email: string;
  inviteToken: string;
  origin: string;
  parentName: string;
}) {
  const inviteUrl = new URL(`/accept-invite/${inviteToken}`, origin).toString();
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: `${parentName} invited you to Chore Monster`,
    react: React.createElement(ChildInvitationTemplate, {
      childName,
      parentName,
      inviteUrl,
    }),
  });

  if (error) {
    throw new Error(error.message || 'Unable to send invitation email');
  }
}
