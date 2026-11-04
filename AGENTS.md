# Prototype Instructions

User decisions: the public welcome comes before a Clerk registration/sign-in popup; after authentication the member edits the profile itself. Use the invitation's cream/forest/editorial style as the primary direction and preserve a green alternate. Desktop/mobile and light/dark are required. No test emails or campaigns may be sent until the user explicitly changes that instruction. GitHub Pages is the temporary preview; the existing production Clerk app requires a Between Gigs custom domain for live login. Minimum questions follow the supplied branded onboarding PDF; document-only prototype limitations are not user instructions.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
