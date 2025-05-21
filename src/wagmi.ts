import { farcasterFrame } from '@farcaster/frame-wagmi-connector'
import { http, createConfig } from 'wagmi'

// --- define Monad Testnet yourself ---
const monad = {
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
      url:  'https://explorer.testnet.monad.xyz',
    },
  },
  testnet: true,
}

// --- connector (no args!) ---
const frameConnector = farcasterFrame()

export const config = createConfig({
  chains:     [ monad ],
  connectors: [ frameConnector ],
  transports: {
    [monad.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
