import React from 'react';
import {
  Body, Button, Container, Head, Heading, Html, Img, Link,
  Preview, Section, Text,
} from 'react-email';

export type InvitationProps = {
  inviteUrl: string;
  physicalAddress: string;
  unsubscribeUrl: string;
  /** The approved, opaque invitation artwork; do not rebuild its typography. */
  posterUrl?: string;
  browserUrl?: string;
  firstName?: string;
  previewOnly?: boolean;
};

const paper = '#f6f0e6';
const forest = '#003d2e';
const sans = 'Arial, Helvetica, sans-serif';
const sourcePoster = 'https://between-gigs.github.io/gigster-onboarding/assets/invitation-reference.png';
const emailCss = [
  ':root { color-scheme: light; supported-color-schemes: light; }',
  'body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }',
  'table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }',
  'img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }',
  '.invitation-sr-heading { mso-hide: all; }',
  'a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }',
  '.invitation-paper { background-color: #f6f0e6 !important; }',
  '.invitation-action { background-color: #003d2e !important; color: #ffffff !important; }',
  '[data-ogsc] .invitation-paper { background-color: #f6f0e6 !important; }',
  '[data-ogsc] .invitation-action { background-color: #003d2e !important; color: #ffffff !important; }',
].join('\n');

/**
 * The original artwork is the visual invitation, linked to the public landing.
 * Live HTML below it keeps the action, address and unsubscribe usable separately.
 */
export default function Invitation({
  inviteUrl, physicalAddress, unsubscribeUrl, posterUrl = sourcePoster,
  browserUrl = new URL('email/invitation.html', inviteUrl.split('#')[0]).href,
  firstName, previewOnly = false,
}: InvitationProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
        <style>{emailCss}</style>
      </Head>
      <Body style={{ margin: 0, padding: '0', backgroundColor: '#e9e5dc', fontFamily: sans, color: forest }}>
        <Preview>You’re invited. Your craft. More possibilities. Create your Between Gigs profile.</Preview>
        <Container className="invitation-paper" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', backgroundColor: paper, color: forest }}>
          <Heading as="h1" className="invitation-sr-heading" style={{ position: 'absolute', width: '1px', height: '1px', maxHeight: '1px', fontSize: '1px', lineHeight: '1px', margin: 0, padding: 0, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap' }}>
            Your craft. More possibilities.
          </Heading>
          <Section style={{ margin: 0, padding: 0, fontSize: 0, lineHeight: 0 }}>
            <Link href={inviteUrl} aria-label="Create your Between Gigs profile" style={{ display: 'block', margin: 0, padding: 0, textDecoration: 'none', color: forest }}>
              <Img
                src={posterUrl}
                width="600"
                alt="Between Gigs. You’re invited. Your craft. More possibilities. Your skills have value beyond the set. Let us help you put them to work. Create your profile."
                style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', margin: 0, padding: 0, border: 0, color: forest, fontFamily: sans, fontSize: '16px', lineHeight: '24px' }}
              />
            </Link>
          </Section>
          <Section className="invitation-paper" style={{ padding: '22px 24px 28px', backgroundColor: paper, textAlign: 'center' }}>
            {firstName && <Text style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '22px', color: forest }}>Hi {firstName},</Text>}
            <Button className="invitation-action" href={inviteUrl} style={{ boxSizing: 'border-box', borderRadius: '6px', backgroundColor: forest, color: '#ffffff', padding: '12px 20px', fontFamily: sans, fontSize: '14px', lineHeight: '20px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
              Create your profile&nbsp; →
            </Button>
            <Text style={{ margin: '16px 0 12px', fontSize: '12px', lineHeight: '19px', color: '#4d655c' }}>
              You’re receiving this invitation to join the Between Gigs community.<br />
              Between Gigs<br />{physicalAddress}
            </Text>
            <Text style={{ margin: 0, fontSize: '12px', lineHeight: '20px', color: forest }}>
              <Link href={unsubscribeUrl} style={{ color: forest, textDecoration: 'underline' }}>Unsubscribe</Link>
              {' · '}
              <Link href={browserUrl} style={{ color: forest, textDecoration: 'underline' }}>Open invitation in your browser</Link>
            </Text>
            {previewOnly && <Text style={{ margin: '16px 0 0', fontSize: '10px', lineHeight: '16px', color: '#4d655c', letterSpacing: '1px' }}>DESIGN PREVIEW · NOT SENT</Text>}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

Invitation.PreviewProps = {
  inviteUrl: 'https://between-gigs.github.io/gigster-onboarding/#/welcome',
  physicalAddress: '11766 Wilshire Blvd, Los Angeles, CA 90025',
  unsubscribeUrl: 'https://between-gigs.github.io/gigster-onboarding/#/unsubscribe-preview',
  posterUrl: sourcePoster,
  previewOnly: true,
} satisfies InvitationProps;
