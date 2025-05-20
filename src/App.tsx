import { useEffect, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  WagmiProvider,
  createConfig,
  http,
  useSwitchChain,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import sdk from '@farcaster/frame-sdk';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StatsTab from './features/StatsTab';
import BossAreaTab from './features/BossAreaTab';
import LeaderboardTab from './features/Leaderboard';
import RewardsTab from './features/Rewards';
import './main.css';

declare global {
  interface Window {
    onSignInSuccess?: (data: any) => void;
  }
}

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
    injected({ shimDisconnect: true }),
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
  const [activeTab, setActiveTab] = useState<'stats' | 'boss' | 'leaderboard' | 'rewards'>('stats');

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    const loadContext = async () => {
      const context = await sdk.context;
      if (context?.user) {
        setFid(context.user.fid ?? null);
        setUsername(context.user.username ?? null);
      }
    };
    loadContext();

    sdk.actions.ready();

    window.onSignInSuccess = (data) => {
      setFid(data.fid);
      setUsername(data.user.username);
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
switchChain({ chainId: monad.id })
    }
  }, [isConnected, switchChain]);

  const handleConnect = () => {
    const injectedConnector = connectors.find(c => c.id === 'injected');
    const farcasterConnector = connectors.find(c => c.id === 'farcaster');

    if (injectedConnector && typeof window !== 'undefined' && window.ethereum) {
      connect({ connector: injectedConnector, chainId: monad.id });
    } else if (farcasterConnector) {
      connect({ connector: farcasterConnector, chainId: monad.id });
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
          {!fid && (
            <div
              className="neynar_signin"
              data-client_id="38f06388-85eb-43d3-a1e3-453c4f04c5be"
              data-success-callback="onSignInSuccess"
              data-theme="dark"
            />
          )}
          {!fid && (
            <script
              src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js"
              async
            ></script>
          )}
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
        <button className={`pixel-button ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Stats</button>
        <button className={`pixel-button ${activeTab === 'boss' ? 'active' : ''}`} onClick={() => setActiveTab('boss')}>Boss Area</button>
        <button className={`pixel-button ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>Leaderboard</button>
        <button className={`pixel-button ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>Rewards</button>
      </div>

      {activeTab === 'stats' && <StatsTab fid={fid} />}
      {activeTab === 'boss' && <BossAreaTab />}
      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'rewards' && <RewardsTab />}
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
