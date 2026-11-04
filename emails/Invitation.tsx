import React from 'react';
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link,
  Preview, Section, Text,
} from 'react-email';

export type InvitationProps = {
  inviteUrl: string;
  physicalAddress: string;
  unsubscribeUrl: string;
  /** Optional, absolute PNG/JPEG URL. The message works with images blocked. */
  artUrl?: string;
  /** Optional, absolute PNG/JPEG logo. Text branding remains the fallback. */
  logoUrl?: string;
  firstName?: string;
  previewOnly?: boolean;
};

const colors = {
  paper: '#f6f0e6', forest: '#003d2e', muted: '#4d655c',
  line: '#c4cec4', mint: '#00d58b', outer: '#e9e5dc',
};
const sans = 'Arial, Helvetica, sans-serif';

/** The invitation's words and action are HTML, not a flattened poster. */
export default function Invitation({
  inviteUrl, physicalAddress, unsubscribeUrl, artUrl, logoUrl,
  firstName, previewOnly = false,
}: InvitationProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
        <style>{`
          :root { color-scheme: light; supported-color-schemes: light; }
          body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
          a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
          .bg-paper { background-color: #f6f0e6 !important; }
          .ink-forest { color: #003d2e !important; }
          .invitation-action { background-color: #003d2e !important; color: #ffffff !important; }
          [data-ogsc] .bg-paper { background-color: #f6f0e6 !important; }
          [data-ogsc] .ink-forest { color: #003d2e !important; }
          [data-ogsc] .invitation-action { background-color: #003d2e !important; color: #ffffff !important; }
        `}</style>
      </Head>
      <Body style={{ margin: 0, padding: '24px 8px', backgroundColor: colors.outer, fontFamily: sans, color: colors.forest }}>
        <Preview>Your skills have value beyond the set. Create your Between Gigs profile.</Preview>
        <Container className="bg-paper" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', backgroundColor: colors.paper, color: colors.forest }}>
          {previewOnly && <Section style={{ backgroundColor: '#e8dcc2', textAlign: 'center', padding: '10px 16px' }}>
            <Text style={{ margin: 0, fontSize: '11px', lineHeight: '16px', color: '#493c22', fontWeight: 700 }}>
              DESIGN PREVIEW · NOT SENT
            </Text>
          </Section>}
          {artUrl && <Img src={artUrl} alt="" width="600" style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto' }} />}
          <Section className="bg-paper" style={{ padding: artUrl ? '28px 24px 12px' : '48px 24px 12px', textAlign: 'center', backgroundColor: colors.paper }}>
            {logoUrl ? <Img src={logoUrl} alt="Between Gigs" width="184" style={{ display: 'block', margin: '0 auto 32px', maxWidth: '184px', height: 'auto' }} /> : <Text className="ink-forest" style={{ margin: '0 0 32px', fontSize: '27px', lineHeight: '30px', letterSpacing: '-1px', fontWeight: 600, color: colors.forest }}>Between Gigs</Text>}
            <Text className="ink-forest" style={{ margin: '0 0 18px', fontSize: '12px', lineHeight: '20px', fontWeight: 600, letterSpacing: '4px', color: colors.forest }}>YOU’RE INVITED</Text>
            <Hr style={{ width: '42px', margin: '0 auto 30px', border: '0', borderTop: `3px solid ${colors.mint}` }} />
            <Heading as="h1" className="ink-forest" style={{ fontFamily: 'Georgia, Times New Roman, serif', margin: '0 0 26px', color: colors.forest, fontSize: '49px', lineHeight: '51px', fontWeight: 700, letterSpacing: '-2px' }}>
              Your craft.<br />More possibilities.
            </Heading>
            {firstName && <Text className="ink-forest" style={{ margin: '0 0 12px', fontSize: '16px', lineHeight: '25px', color: colors.forest }}>Hi {firstName},</Text>}
            <Text className="ink-forest" style={{ margin: '0 auto 28px', maxWidth: '390px', fontSize: '21px', lineHeight: '30px', color: colors.forest }}>
              Your skills have value beyond the set. Let us help you put them to work.
            </Text>
            <Button className="invitation-action" href={inviteUrl} style={{ boxSizing: 'border-box', borderRadius: '6px', backgroundColor: colors.forest, color: '#ffffff', padding: '18px 28px', fontFamily: sans, fontSize: '17px', lineHeight: '22px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
              Create your profile&nbsp; →
            </Button>
            <Text style={{ margin: '22px 0 10px', fontSize: '13px', lineHeight: '20px', color: colors.muted }}>
              Your skills. Your rates. Your schedule.<br />Save your progress and come back anytime.
            </Text>
          </Section>
          <Section className="bg-paper" style={{ padding: '24px 28px 36px', backgroundColor: colors.paper, textAlign: 'center' }}>
            <Hr style={{ margin: '0 0 20px', border: 0, borderTop: `1px solid ${colors.line}` }} />
            <Text style={{ margin: '0 0 12px', fontSize: '12px', lineHeight: '19px', color: colors.muted }}>
              You’re receiving this invitation to join the Between Gigs community.<br />
              Between Gigs<br />{physicalAddress}
            </Text>
            <Text style={{ margin: 0, fontSize: '12px', lineHeight: '20px', color: colors.muted }}>
              <Link href={unsubscribeUrl} style={{ color: colors.forest, textDecoration: 'underline' }}>Unsubscribe</Link>
              {' · '}
              <Link href={inviteUrl} style={{ color: colors.forest, textDecoration: 'underline' }}>Open invitation in your browser</Link>
            </Text>
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
  previewOnly: true,
} satisfies InvitationProps;
