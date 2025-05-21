import { useEffect, useState } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  WagmiProvider,
} from 'wagmi';
import { config } from './wagmi';
import sdk from '@farcaster/frame-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StatsTab from './features/StatsTab';
import BossAreaTab from './features/BossAreaTab';
import LeaderboardTab from './features/Leaderboard';
import RewardsTab from './features/Rewards';
import './main.css';

declare global {
  interface Window {
    ethereum?: any;
    onSignInSuccess?: (data: any) => void;
  }
}

const queryClient = new QueryClient();

function NTSApp() {
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'boss' | 'leaderboard' | 'rewards'>('stats');
  const [isMiniApp, setIsMiniApp] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // load Farcaster context
  useEffect(() => {
    const loadContext = async () => {
      const context = await sdk.context;
      if (context?.user) {
        setFid(context.user.fid ?? null);
        setUsername(context.user.username ?? null);
        setIsMiniApp(true);
      }
      sdk.actions.ready();
    };
    loadContext();

    window.onSignInSuccess = (data) => {
      setFid(data.fid);
      setUsername(data.user.username);
    };
  }, []);

  // auto-connect + switch chain in mini-app
  useEffect(() => {
    if (!isMiniApp || isConnected) return;
    (async () => {
      const farcasterConnector = connectors.find((c) => c.id === 'farcaster');
      if (farcasterConnector) {
        await connect({ connector: farcasterConnector });
        await switchChain({ chainId: config.chains[0].id });
      }
    })();
  }, [isMiniApp, isConnected, connectors, connect, switchChain]);

  const handleConnect = async () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    const farcasterConnector = connectors.find((c) => c.id === 'farcaster');

    try {
      if (injectedConnector && window.ethereum) {
        await connect({ connector: injectedConnector });
        await switchChain({ chainId: config.chains[0].id });
      } else if (farcasterConnector) {
        await connect({ connector: farcasterConnector });
        await switchChain({ chainId: config.chains[0].id });
      } else {
        alert('No supported wallet connector available');
        return;
      }
      // reload only after successful switch
      window.location.reload();
    } catch (err) {
      console.error('Wallet connection or chain switch failed:', err);
      alert('Connection failed. Make sure your wallet supports Monad Testnet.');
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
