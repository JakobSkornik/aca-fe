import Head from 'next/head'
import type { ReactNode } from 'react'
import styles from './survey.module.css'

export default function SurveyLayout({ title, children }: { title: string; children: ReactNode }) {
  return <div className={styles.page}>
    <Head>
      <title>{title} · Chess commentary study</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="referrer" content="no-referrer" />
    </Head>
    <header className={styles.masthead}><span className={styles.mark} aria-hidden="true">♞</span>
      <div><strong>Chess commentary study</strong><div className={styles.muted}>A prototype study · Participant experience</div></div>
    </header>
    {children}
  </div>
}
