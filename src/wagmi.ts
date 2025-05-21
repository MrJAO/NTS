import { farcasterFrame } from '@farcaster/frame-wagmi-connector'
import { injected } from 'wagmi/connectors'
import { http, createConfig } from 'wagmi'

// --- define Monad Testnet yourself ---
export const monad = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public:  { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url:  'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
}

// ---connectors: Farcaster first, then fallback to injected wallets---
export const config = createConfig({
  chains:     [ monad ],
  connectors: [
    // 1) the in-App Farcaster wallet (no args!)
    farcasterFrame(),
    // 2) any injected wallet (MetaMask etc) as a fallback
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [monad.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
