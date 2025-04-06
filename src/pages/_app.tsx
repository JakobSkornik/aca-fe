import type { AppProps } from 'next/app'
import '../styles/globals.css'

import { GameStateProvider } from '../contexts/GameStateContext'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <GameStateProvider>
      <Component {...pageProps} />
    </GameStateProvider>
  )
}

export default MyApp
