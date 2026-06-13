import { Html, Head, Main, NextScript } from 'next/document'

// Apply the persisted theme before paint to avoid a flash; default dark.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('aca_theme');document.documentElement.setAttribute('data-theme', t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`

export default function Document() {
  return (
    <Html lang="en" data-theme="dark">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
