import React from 'react';
import { render, toPlainText } from 'react-email';
import Invitation, { type InvitationProps } from './Invitation';

export async function renderInvitation(props: InvitationProps) {
  const html = await render(<Invitation {...props} />);
  if (Buffer.byteLength(html, 'utf8') >= 100_000) throw new Error('Email is too large and may be clipped in Gmail.');
  return { html, text: toPlainText(html) };
}
