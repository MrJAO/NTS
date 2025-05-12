import { useEffect, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  WagmiProvider,
  createConfig,
  http,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import sdk from '@farcaster/frame-sdk';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StatsTab from './features/StatsTab';
import BossAreaTab from './features/BossAreaTab';
import './main.css';
import AdminTab from './pages/AdminTab';

// Monad Testnet chain config
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
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.testnet.monad.xyz',
    },
  },
  testnet: true,
};

const config = createConfig({
  connectors: [
    farcasterFrame(),
    injected({
      shimDisconnect: true,
    }),
  ],
  chains: [monad],
  transports: {
    [monad.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

const queryClient = new QueryClient();

function NTSApp() {
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'boss' | 'leaderboard' | 'rewards' | 'admin'>('stats');

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    const loadContext = async () => {
      const context = await sdk.context;
      setFid(context?.user?.fid ?? null);
      setUsername(context?.user?.username ?? null);
    };
    loadContext();
  }, []);

  const handleConnect = () => {
    // Prefer injected in browser, fallback to farcasterFrame if inside Warpcast
    const injectedConnector = connectors.find(c => c.id === 'injected');
    const farcasterConnector = connectors.find(c => c.id === 'farcaster');

    if (injectedConnector && typeof window !== 'undefined' && window.ethereum) {
      connect({ connector: injectedConnector });
    } else if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    } else {
      alert('No supported wallet connector available');
    }
  };

  return (
    <div className="app-container">
      <div className="pixel-header">
        <div className="user-box">
          <span>🪪 FID: {fid ?? '—'}</span>
          <span>👤 Username: {username ?? '—'}</span>
        </div>
        <div>
          {isConnected ? (
            <>
              <p>🔗 Wallet: {address}</p>
              <button className="pixel-button" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="pixel-button" onClick={handleConnect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

<div className="tab-nav">
  <button
    className={`pixel-button ${activeTab === 'stats' ? 'active' : ''}`}
    onClick={() => setActiveTab('stats')}
  >
    Stats
  </button>
  <button
    className={`pixel-button ${activeTab === 'boss' ? 'active' : ''}`}
    onClick={() => setActiveTab('boss')}
  >
    Boss Area
  </button>
  <button
    className={`pixel-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
    onClick={() => setActiveTab('leaderboard')}
  >
    Leaderboard
  </button>
  <button
    className={`pixel-button ${activeTab === 'rewards' ? 'active' : ''}`}
    onClick={() => setActiveTab('rewards')}
  >
    Rewards
  </button>
  <button
    className={`pixel-button ${activeTab === 'admin' ? 'active' : ''}`}
    onClick={() => setActiveTab('admin')}
  >
    Admin
  </button>
</div>

{activeTab === 'stats' && <StatsTab />}
{activeTab === 'boss' && <BossAreaTab />}
{activeTab === 'leaderboard' && (
  <div className="tab-content text-center">
    <p>🏆 Leaderboard coming soon...</p>
  </div>
)}
{activeTab === 'rewards' && (
  <div className="tab-content text-center">
    <p>🎁 Rewards system coming soon...</p>
  </div>
)}
{activeTab === 'admin' && <AdminTab />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <NTSApp />
      </WagmiProvider>
    </QueryClientProvider>
  );
}
