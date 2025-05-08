import { useEffect, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  WagmiConfig,
  createConfig,
  http,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import sdk from '@farcaster/frame-sdk';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Monad Testnet chain config
const monad = {
  id: 9999,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://node.monad.monster'] },
  },
};

const config = createConfig({
  connectors: [farcasterFrame(), injected()],
  chains: [monad],
  transports: {
    [monad.id]: http('https://node.monad.monster'),
  },
});

const queryClient = new QueryClient();

function NTSApp() {
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    const loadContext = async () => {
      const context = await sdk.context;
      setFid(context.user.fid);
      setUsername(context.user.username ?? null);
    };
    loadContext();
  }, []);

  const handleConnect = () => {
    const connector = connectors.find(c => c.ready)
    if (connector) {
      connect({ connector })
    } else {
      alert('No wallet connector available')
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>NTS – Mini App</h2>
      <p>🪪 FID: {fid}</p>
      <p>👤 Username: {username}</p>

      {isConnected ? (
        <>
          <p>🔗 Wallet: {address}</p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <NTSApp />
      </WagmiConfig>
    </QueryClientProvider>
  );
}
