import { useState, useEffect } from "react";
import { useAccount, useContractRead, useWriteContract } from "wagmi"; // ✅ added useWriteContract
import roastLines from "../constants/roastLines";
import damageGameArtifact from "../../abis/DamageGame.json";

const DAMAGE_GAME_ADDRESS = "0x21F6a95B3895E4028D688667D891F28EC2eab4b8";
const SPAWN_INTERVAL = 12 * 60 * 60; // 12 hours

export default function BossAreaTab() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract(); // ✅ added hook
  const [activeBoss] = useState("Overgas");
  const [activeTab, setActiveTab] = useState<'tx' | 'stake' | 'create' | 'nft' | 'cast'>('tx');
  const [randomRoast, setRandomRoast] = useState(() => roastLines[Math.floor(Math.random() * roastLines.length)]);
  const [timer, setTimer] = useState("");
  const [canSpawn, setCanSpawn] = useState(false);
  const [spawnLoading, setSpawnLoading] = useState(false);

  const { data: bossHealth } = useContractRead({
    address: DAMAGE_GAME_ADDRESS,
    abi: damageGameArtifact,
    functionName: "bossHealth"
  });

  const { data: bossMaxHealth } = useContractRead({
    address: DAMAGE_GAME_ADDRESS,
    abi: damageGameArtifact,
    functionName: "bossMaxHealth"
  });

  const { data: lastSpawn } = useContractRead({
    address: DAMAGE_GAME_ADDRESS,
    abi: damageGameArtifact,
    functionName: "lastBossSpawn"
  });

  useEffect(() => {
    const roastInterval = setInterval(() => {
      const next = roastLines[Math.floor(Math.random() * roastLines.length)];
      setRandomRoast(next);
    }, Math.floor(15000 + Math.random() * 5000)); // 15–20s
    return () => clearInterval(roastInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSpawn) {
        const now = Math.floor(Date.now() / 1000);
        const nextSpawn = Number(lastSpawn) + SPAWN_INTERVAL;
        const diff = nextSpawn - now;

        setCanSpawn(diff <= 0);

        const hours = Math.max(Math.floor(diff / 3600), 0);
        const mins = Math.max(Math.floor((diff % 3600) / 60), 0);
        const secs = Math.max(diff % 60, 0);

        setTimer(`${hours}hr ${mins}mins ${secs}secs`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSpawn]);

  const handleSpawnBoss = async () => {
    try {
      setSpawnLoading(true);
      await writeContractAsync({
        address: DAMAGE_GAME_ADDRESS,
        abi: damageGameArtifact,
        functionName: "spawnBoss",
      });
      alert("✅ Boss spawned!");
    } catch (err) {
      alert("❌ Failed to spawn boss");
    } finally {
      setSpawnLoading(false);
    }
  };

  const getBossGif = (bossName: string) => {
    const gifMap: Record<string, string> = {
      "Fudster": "/Fudster.gif",
      "Jeetar": "/Jeetar.gif",
      "Flyperhands": "/Flyperhands.gif",
      "Overgas": "/Overgas.gif",
      "Dr.Dumps": "/DrDumps.gif",
      "Mr.Insidor": "/MrInsidor.gif"
    };
    return gifMap[bossName] || "/Overgas.gif";
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'tx':
        return (
          <div className="tab-section">
            <input type="text" placeholder="Enter TX hash" className="input-box" />
            <button className="pixel-button">Submit Hash</button>
          </div>
        );
      case 'stake':
        return (
          <div className="tab-section">
            <input type="text" placeholder="Amount to Stake" className="input-box" />
            <button className="pixel-button">Stake</button>
          </div>
        );
      case 'create':
        return (
          <div className="tab-section">
            <input type="text" placeholder="Token Name" className="input-box" />
            <input type="text" placeholder="Ticker" className="input-box" />
            <input type="text" placeholder="Supply" className="input-box" />
            <button className="pixel-button">Create Token</button>
          </div>
        );
      case 'nft':
        return (
          <div className="tab-section">
            <input type="text" placeholder="NFT Name" className="input-box" />
            <input type="text" placeholder="Description" className="input-box" />
            <input type="text" placeholder="Supply" className="input-box" />
            <button className="pixel-button">Create NFT</button>
          </div>
        );
      case 'cast':
        return (
          <div className="tab-section">
            <button className="pixel-button">Cast</button>
            <p className="mini-note">
              +1 damage per Like, Comment, Quote<br />
              +5 per buyer (Token/NFT)
            </p>
          </div>
        );
    }
  };

  const current = Number(bossHealth || 0);
  const max = Number(bossMaxHealth || 1);
  const percent = (current / max) * 100;

  return (
    <div className="tab-content">
      <h2 className="mini-note" style={{ fontSize: "14px", textAlign: "center", marginBottom: "10px" }}>
        {activeBoss}
      </h2>

      <div className="health-bar-container">
        <div className="health-bar" style={{ width: `${percent}%` }}></div>
      </div>

      <p className="mini-note boss-health-count">
        {current.toLocaleString()} / {max.toLocaleString()}
      </p>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <img src={getBossGif(activeBoss)} alt="Boss GIF" className="boss-gif" />
      </div>

      <div className="roast-box" style={{ fontSize: "12px" }}>
        "{randomRoast}"
      </div>

      <div className="timer">Next Boss spawning in: {timer}</div>
      <div className="multiplier">Your Damage Multiplier: x1.2</div>

      <div style={{ margin: "10px 0", textAlign: "center" }}>
        <button
          className="pixel-button"
          disabled={!address || !canSpawn || spawnLoading}
          onClick={handleSpawnBoss}
          style={{ opacity: canSpawn && address ? 1 : 0.5 }}
        >
          {spawnLoading ? "Spawning..." : "Spawn Boss"}
        </button>
      </div>

      <div className="boss-buttons">
        <button className="pixel-button" onClick={() => setActiveTab('tx')}>TX Hash</button>
        <button className="pixel-button" onClick={() => setActiveTab('stake')}>Stake</button>
        <button className="pixel-button" onClick={() => setActiveTab('create')}>Create Token</button>
        <button className="pixel-button" onClick={() => setActiveTab('nft')}>Create NFT</button>
        <button className="pixel-button" onClick={() => setActiveTab('cast')}>Cast</button>
      </div>

      {renderTab()}
    </div>
  );
}
