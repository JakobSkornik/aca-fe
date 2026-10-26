This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Commentary evidence panel

`RuleEvidenceRows` combines retained rule statements, supporting-position navigation,
native-unit feature charts and rule checks. Main and alternative branches retain separate
baselines and support plies. Missing series or inconsistent anchors produce unknown checks;
the claim's ranking score is never substituted for a feature delta. Captures, pins and other
board predicates are described as board evidence, without invented numeric thresholds.

Existing exports do not record the full trigger configuration. Checks are therefore explicitly
labelled as reference checks against the bundled rule definitions, not historical trigger traces
or proof that a fact appeared in the LLM's final prose. Additional geometric/phase conditions
are called out where they cannot be verified from the saved feature series.

Refresh constants after reviewing changes to backend rule definitions:

```bash
python scripts/export-rule-reference.py --backend ../automatic-chess-annotator
node tests/rule-evidence.cjs
npm run typecheck
```

The generated reference includes a rule-source fingerprint. If predicate logic changes, update
`src/helpers/ruleEvidence.ts` and its regression checks as well; regenerating thresholds alone
does not update the predicate logic. Unrecognized rules remain visible with unavailable trigger
details. The exporter reads source files without invoking the engine, providers or survey runner.

## Next.js resources

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
