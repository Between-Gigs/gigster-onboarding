import React from 'react';
import { render } from 'react-email';
import Invitation, { type InvitationProps } from './Invitation';

export async function renderInvitation(props: InvitationProps) {
  const html = await render(<Invitation {...props} />);
  if (Buffer.byteLength(html, 'utf8') >= 100_000) throw new Error('Email is too large and may be clipped in Gmail.');
  // Image text is not reliably extracted by HTML-to-text converters.
  const text = [
    ...(props.previewOnly ? ['DESIGN PREVIEW · NOT SENT', ''] : []),
    'Between Gigs — You’re invited',
    '',
    ...(props.firstName ? ['Hi ' + props.firstName + ',', ''] : []),
    'Your craft. More possibilities.',
    '',
    'Your skills have value beyond the set. Let us help you put them to work.',
    '',
    'Create your profile: ' + props.inviteUrl,
    '',
    'Your skills. Your rates. Your schedule.',
    'Save your progress and come back anytime.',
    '',
    'You’re receiving this invitation to join the Between Gigs community.',
    'Between Gigs · ' + props.physicalAddress,
    'Unsubscribe: ' + props.unsubscribeUrl,
    'Open invitation in your browser: ' + (props.browserUrl || new URL('email/invitation.html', props.inviteUrl.split('#')[0]).href),
  ].join('\n');
  return { html, text };
}
