import { useState, useEffect } from "react";
import { useAccount, useContractRead, useWriteContract } from "wagmi";
import roastLines from "../constants/roastLines";
import damageGameArtifact from "../../abis/DamageGame.json";

type UserStruct = [
  totalDamage: bigint,
  accumulatedDamage: bigint,
  lastStakeTime: bigint,
  lastTokenCreate: bigint,
  lastNFTCreate: bigint,
  txCount: bigint,
  followerCount: bigint
];

const DAMAGE_GAME_ADDRESS = "0x3638D6aC0EC8081d6241DF9Dd95Da6c1BcF9d538";
const SPAWN_INTERVAL = 12 * 60 * 60;
const bossList = ["Fudster", "Jeetar", "Flyperhands", "Overgas", "Dr.Dumps", "Mr.Insidor"];
const ALCHEMY_URL = `https://monad-testnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`;
const NEYNAR_KEY = import.meta.env.VITE_NEYNAR_API_KEY;

const FEATURED_NFTS = [
  "0xa980f072bc06d67faec2b03a8ada0d6c9d0da9f8",
  "0xff59f1e14c4f5522158a0cf029f94475ba469458",
  "0x88bbcba96a52f310497774e7fd5ebadf0ece21fb",
  "0xe6b5427b174344fd5cb1e3d5550306b0055473c6",
  "0x26c86f2835c114571df2b6ce9ba52296cc0fa6bb",
  "0xa568cabe34c8ca0d2a8671009ae0f6486a314425",
  "0x9ac5998884cf59d8a87dfc157560c1f0e1672e04",
  "0xe25c57ff3eea05d0f8be9aaae3f522ddc803ca4e",
  "0x3a9acc3be6e9678fa5d23810488c37a3192aaf75",
  "0xcab08943346761701ec9757befe79ea88dd67670",
  "0xba838e4cca4b852e1aebd32f248967ad98c3aa45",
  "0x5d2a7412872f9dc5371d0cb54274fdb241171b95",
  "0x813fa68dd98f1e152f956ba004eb2413fcfa7a7d",
  "0xc29b98dca561295bd18ac269d3d9ffdfcc8ad426",
  "0x69f2688abe5dcde0e2413f77b80efcc16361a56e",
  "0x977b9b652dcd87e5fbdb849b12ab63a6bb01ac05",
  "0x66b655de495268eb4c7b70bf4ac1ab4094589f93",
  "0x49d54cd9ca8c5ecadbb346dc6b4e31549f34e405",
  "0xe8f0635591190fb626f9d13c49b60626561ed145",
  "0xf7b984c089534ff656097e8c6838b04c5652c947",
  "0x9e4339d4d36bac6747e4e42e85e39cd1e2c58a1f",
  "0x87e1f1824c9356733a25d6bed6b9c87a3b31e107",
  "0xbb406139138401f4475ca5cf2d7152847159eb7a",
  "0x3a9454c1b4c84d1861bb1209a647c834d137b442",
  "0x78ed9a576519024357ab06d9834266a04c9634b7",
  "0x9a452f1ae5c1927259dacfa3fd58ede9679c61d0",
  "0x33cafd437816eb5aafe2b2e7bedf82a3d8d226e7",
  "0x6b5bf2a49d18d2d7f628415060bd1ec11464595d",
  "0x5af1e57d7d1c8a83d5dd244de71227caa2d69b31",
  "0x2577a6bf5ea12b5e2b53bc7bd3fc93a529434d11",
  "0x2eFe558C1b4636144D32127E9C12E36508350a02",
  // "0x6ed438b2a8eff227e7e54b5324926941b140eea0", removing atm
  "0x800f8cacc990dda9f4b3f1386c84983ffb65ce94",
  "0x209fb14943e9412354e982c4784bf89df760bf8f"
];

export default function BossAreaTab() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [activeBoss, setActiveBoss] = useState<string | null>(() => {
    return localStorage.getItem("activeBoss") || "Overgas";
  });
  const [activeTab, setActiveTab] = useState<'tx' | 'stake' | 'create' | 'nft' | 'cast'>('tx');
  const [randomRoast, setRandomRoast] = useState(() => roastLines[Math.floor(Math.random() * roastLines.length)]);
  const [timer, setTimer] = useState("");
  const [canSpawn, setCanSpawn] = useState(false);
  const [spawnLoading, setSpawnLoading] = useState(false);
  const [txHashInput, setTxHashInput] = useState("");
  const [txCount, setTxCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [loadingMultiplier, setLoadingMultiplier] = useState(false);
  const [stakeAmt, setStakeAmt] = useState("");
  const [staking, setStaking] = useState(false);
  const [stakeCooldownText, setStakeCooldownText] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenTicker, setTokenTicker] = useState("");
  const [tokenSupply, setTokenSupply] = useState("");
  const [tokenCooldownText, setTokenCooldownText] = useState("");
  const [castHash, setCastHash] = useState("");
  const [castSignature, setCastSignature] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

const { data: userData } = useContractRead({
  address: DAMAGE_GAME_ADDRESS,
  abi: damageGameArtifact,
  functionName: "users",
  args: [address]
});

const lastTokenCreate = userData ? Number((userData as UserStruct)[3]) : 0;

const hasTokenCooldown =
  lastTokenCreate > 0 &&
  Date.now() < lastTokenCreate * 1000 + 7 * 24 * 60 * 60 * 1000;

const userTokenRead = useContractRead({
  address: DAMAGE_GAME_ADDRESS,
  abi: damageGameArtifact,
  functionName: "userToken",
  args: [address],
});

const userToken = userTokenRead.data as string | undefined;

  useEffect(() => {
    const roastInterval = setInterval(() => {
      const next = roastLines[Math.floor(Math.random() * roastLines.length)];
      setRandomRoast(next);
    }, Math.floor(15000 + Math.random() * 5000));
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

useEffect(() => {
  const interval = setInterval(() => {
    const lastStake = userData ? Number((userData as UserStruct)[2]) : 0;
    const endsAt = lastStake * 1000 + 24 * 60 * 60 * 1000;
    const diff = endsAt - Date.now();

    if (diff <= 0) {
      setStakeCooldownText("");
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    setStakeCooldownText(`${hours}h ${minutes}m ${seconds}s`);
  }, 1000);
  return () => clearInterval(interval);
}, [userData]);

  useEffect(() => {
  const interval = setInterval(() => {
    if (!hasTokenCooldown) {
      setTokenCooldownText("");
      return;
    }
    const endsAt = lastTokenCreate * 1000 + 7 * 24 * 60 * 60 * 1000;
    const diff = endsAt - Date.now();

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    setTokenCooldownText(`${hours}h ${minutes}m ${seconds}s`);
  }, 1000);
  return () => clearInterval(interval);
}, [lastTokenCreate, hasTokenCooldown]);

const handleSubmitTxHash = async () => {
  if (!address || !txHashInput) return;
  try {
    const hashBytes = `0x${txHashInput.replace(/^0x/, "")}`;
await writeContractAsync({
  address: DAMAGE_GAME_ADDRESS,
  abi: damageGameArtifact,
  functionName: "submitTxHash",
  args: [hashBytes]
});
    alert("✅ Damage submitted to boss!");
  } catch (err) {
    console.error("❌ TX submission failed:", err);
    alert("❌ Failed to submit TX hash");
  }
};

  const handleSpawnBoss = async () => {
    try {
      setSpawnLoading(true);

      await writeContractAsync({
        address: DAMAGE_GAME_ADDRESS,
        abi: damageGameArtifact,
        functionName: "spawnBoss",
      });

      const nextBoss = bossList[Math.floor(Math.random() * bossList.length)];
      setActiveBoss(nextBoss);
      localStorage.setItem("activeBoss", nextBoss);

      alert(`✅ ${nextBoss} has spawned!`);
    } catch (err) {
      alert("❌ Failed to spawn boss");
      console.error("spawnBoss error:", err);
    } finally {
      setSpawnLoading(false);
    }
  };

const refreshMultiplier = async () => {
  if (!address) return;
  setLoadingMultiplier(true);
  try {
    let txDecimal = 0;
    let followers = 0;
    let nfts = 0;

    // TX Count
    const txRes = await fetch(`${ALCHEMY_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionCount",
        params: [address, "latest"]
      })
    });
    const txJson = await txRes.json();
    txDecimal = parseInt(txJson?.result || "0x0", 16);
    setTxCount(txDecimal);

    // NFT Count
// NFT Count
const failedNfts: string[] = [];
for (const contract of FEATURED_NFTS) {
  try {
    const res = await fetch(`${ALCHEMY_URL}/getNFTs?owner=${address}&contractAddresses[]=${contract}`);
    if (!res.ok) {
      console.warn(`⚠️ Failed to fetch NFTs for: ${contract} | Status: ${res.status}`);
      failedNfts.push(contract);
      continue;
    }
    const json = await res.json();
    if (json?.ownedNfts?.length > 0) {
      nfts++;
    }
  } catch (err) {
    console.warn(`❌ Error fetching NFTs for: ${contract}`, err);
    failedNfts.push(contract);
  }
}
    console.log("✅ Total NFTs found:", nfts);
    console.log("❌ Unreadable NFT Contracts:", failedNfts);

    // Follower Count
    try {
      const farcasterRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
        { headers: { accept: "application/json", api_key: NEYNAR_KEY } }
      );
      const farcasterJson = await farcasterRes.json();
      followers = farcasterJson?.users?.[0]?.follower_count || 0;
      setFollowerCount(followers);
    } catch (err) {
      console.warn("⚠️ Failed to fetch Farcaster followers:", err);
      followers = 0;
    }

    setShowSubmit(true);
  } catch (err) {
    console.error("Failed to refresh multiplier:", err);
    alert("❌ Refresh failed.");
  } finally {
    setLoadingMultiplier(false);
  }
};

// Submit user TX/follower metadata to smart contract
const submitMetadata = async () => {
  try {
    await writeContractAsync({
      address: DAMAGE_GAME_ADDRESS,
      abi: damageGameArtifact,
      functionName: "setUserMetadata",
      args: [txCount, followerCount]
    });
    alert("✅ Metadata submitted on-chain.");
    setShowSubmit(false);
  } catch (err) {
    console.error("❌ Metadata submission failed:", err);
    alert("❌ Failed to submit metadata.");
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

const handleStake = async () => {
  if (!address || !stakeAmt) return;
  setStaking(true);
  try {
    const amt = BigInt(Math.floor(Number(stakeAmt) * 1e18));
    await writeContractAsync({
      address: DAMAGE_GAME_ADDRESS,
      abi: damageGameArtifact,
      functionName: "stakeMON",
      value: amt
    });
    alert("✅ MON staked! Boss took damage.");
  } catch (err) {
    console.error("❌ Stake failed:", err);
    alert("❌ Staking failed. Try again.");
  } finally {
    setStaking(false);
  }
};

const handleCreateToken = async () => {
  if (!address) return;
const now = Date.now();
if (lastTokenCreate > 0 && now < lastTokenCreate * 1000 + 7 * 24 * 60 * 60 * 1000) {
  alert("⏳ You can only create a token once every 7 days.");
  return;
}

  try {
    setCreatingToken(true);
await writeContractAsync({
  address: DAMAGE_GAME_ADDRESS,
  abi: damageGameArtifact,
  functionName: "createToken",
  args: [tokenName, tokenTicker, BigInt(Math.floor(Number(tokenSupply)))],
});
    alert("✅ Token created! Boss took damage.");
  } catch (err) {
    console.error("❌ Token creation failed:", err);
    alert("❌ Failed to create token. Possibly in cooldown.");
  } finally {
    setCreatingToken(false);
  }
};

  const renderTab = () => {
    switch (activeTab) {
      case 'tx':
        return (
          <div className="tab-section">
            <input
              type="text"
              placeholder="Enter TX hash"
              className="input-box"
              value={txHashInput}
              onChange={(e) => setTxHashInput(e.target.value)}
            />
            <button className="pixel-button" onClick={handleSubmitTxHash}>
              Submit Hash
            </button>
          </div>
        );
case 'stake':
  return (
    <div className="tab-section">
      <input
        type="number"
        placeholder="Amount to Stake (MON)"
        className="input-box"
        value={stakeAmt}
        onChange={(e) => setStakeAmt(e.target.value)}
      />
<p className="mini-note" style={{ fontSize: "8px", marginTop: "4px", color: "#ffcc00" }}>
  {stakeCooldownText
    ? `⏳ Already staked today. Cooldown ends in: ${stakeCooldownText}`
    : "✅ You can stake now and deal damage to the boss"}
</p>
      <button className="pixel-button" onClick={handleStake} disabled={staking}>
        {staking ? "Staking..." : "Stake"}
      </button>
    </div>
  );
case 'create':
  return (
    <div className="tab-section">
      <input
        type="text"
        placeholder="Token Name"
        className="input-box"
        value={tokenName}
        onChange={(e) => setTokenName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Ticker"
        className="input-box"
        value={tokenTicker}
        onChange={(e) => setTokenTicker(e.target.value)}
      />
      <input
        type="text"
        placeholder="Supply"
        className="input-box"
        value={tokenSupply}
        onChange={(e) => setTokenSupply(e.target.value)}
      />
      <button
        className="pixel-button"
        onClick={handleCreateToken}
        disabled={creatingToken || hasTokenCooldown}
      >
        {creatingToken ? "Creating..." : "Create Token"}
      </button>
<p className="mini-note" style={{ fontSize: "8px", marginTop: "4px", color: "#ffcc00" }}>
  {hasTokenCooldown
    ? `⏳ Already created a token this week. Cooldown ends in: ${tokenCooldownText}`
    : "✅ You can create a token this week and deal extra damage to the boss"}
</p>
      {userToken && userToken !== "0x0000000000000000000000000000000000000000" && (
        <p className="mini-note" style={{ fontSize: "10px", marginTop: "6px", color: "#90ee90" }}>
          ✅ Token created at: {userToken}
        </p>
      )}
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
  const generateSignature = async () => {
    if (!castHash || !address) return;
    setGenerating(true);
    try {
      const res = await fetch("https://nts-production.up.railway.app/api/sign-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: castHash, ethAddress: address })
      });
      const json = await res.json();
      setCastSignature(json.signature || "");
    } catch (err) {
      alert("❌ Failed to generate signature");
      console.error(err);
    }
    setGenerating(false);
  };

  const submitCast = async () => {
    if (!castHash || !castSignature || !address) return;

    setSubmitting(true);
    try {
      await fetch("https://nts-production.up.railway.app/api/neynar-cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-neynar-signature": castSignature
        },
        body: JSON.stringify({
          data: {
            hash: castHash,
            author: {
              verified_addresses: {
                eth_addresses: [address]
              }
            }
          }
        })
      });
      alert("✅ Cast damage submitted!");
    } catch (err) {
      alert("❌ Failed to submit cast");
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <div className="tab-section">
      <p className="mini-note" style={{ textAlign: "center", fontSize: "9px", color: "#ffcc00" }}>
        ⚠️ Check Stats Tab for this feature guide.
      </p>

      <input
        type="text"
        className="input-box"
        placeholder="Paste your Cast Hash"
        value={castHash}
        onChange={(e) => setCastHash(e.target.value)}
      />
      <button className="pixel-button" onClick={generateSignature} disabled={generating}>
        {generating ? "Generating..." : "Generate Signature"}
      </button>

      <input
        type="text"
        className="input-box"
        placeholder="Paste Generated Signature"
        value={castSignature}
        onChange={(e) => setCastSignature(e.target.value)}
      />
      <button className="pixel-button" onClick={submitCast} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Cast Damage"}
      </button>

      <p className="mini-note" style={{ marginTop: "10px", fontSize: "12px", color: "#ffd700" }}>
        📦 Your Accumulated Damage: {userData ? ((userData as UserStruct)[1]).toString() : "0"}
      </p>

      <p className="mini-note">
        +1 per Like, Comment, Quote
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
      <p className="mini-note" style={{ textAlign: "center", fontSize: "9px", color: "#ffcc00" }}>
          ⚠️ Use Metamask or Farcaster Wallets only  
      </p>

      <h2 className="mini-note" style={{ fontSize: "14px", textAlign: "center", marginBottom: "10px" }}>
        {activeBoss ?? "🔥 Unknown Boss"}
      </h2>

      <div className="health-bar-container">
        <div className="health-bar" style={{ width: `${percent}%` }}></div>
      </div>

      <p className="mini-note boss-health-count">
        {current.toLocaleString()} / {max.toLocaleString()}
      </p>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <img src={getBossGif(activeBoss || "Overgas")} alt="Boss GIF" className="boss-gif" />
      </div>

      <div className="roast-box" style={{ fontSize: "12px" }}>
        "{randomRoast}"
      </div>

      <div className="timer">Spawn next Boss in: {timer}</div>

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

<div className="multiplier" style={{ textAlign: "center", marginTop: "8px" }}>
  <div style={{ marginTop: "8px" }}>
    {!showSubmit ? (
      <button className="pixel-button" onClick={refreshMultiplier} disabled={loadingMultiplier}>
        {loadingMultiplier ? "Refreshing data..." : "Refresh Damage"}
      </button>
    ) : (
      <button className="pixel-button" onClick={submitMetadata}>
        Submit Onchain Data
      </button>
    )}

    <p className="mini-note" style={{ textAlign: "center", fontSize: "9px", color: "#ffcc00" }}>
        ⚠️ For new users, Refresh Damage and submit Onchain Data for your actual damages.
    </p>
    <p className="mini-note" style={{ textAlign: "center", fontSize: "9px", color: "#90ee90" }}>
        📝 For existing users, You can overwrite onchain data if you increase your previous stats.
    </p>
  </div>
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
