import { useState } from "react";
import { useAccount } from "wagmi";
import { JsonRpcProvider, formatEther, Contract } from "ethers";
import damageGameABI from "../../abis/DamageGame.json";

const DAMAGE_GAME_ADDRESS = "0x3638D6aC0EC8081d6241DF9Dd95Da6c1BcF9d538";
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const NEYNAR_KEY = import.meta.env.VITE_NEYNAR_API_KEY;
const ALCHEMY_URL = `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

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
  "0x800f8cacc990dda9f4b3f1386c84983ffb65ce94",
  "0x209fb14943e9412354e982c4784bf89df760bf8f"
];

export default function StatsTab({ fid }: { fid: number | null }) {
  const { address } = useAccount();
  const [mon, setMon] = useState("-");
  const [txCount, setTxCount] = useState("-");
  const [nftCount, setNftCount] = useState("-");
  const [damage, setDamage] = useState("-");
  const [followerCount, setFollowerCount] = useState("-");
  const [loading, setLoading] = useState(false);
  const [pfpUrl, setPfpUrl] = useState("https://i.pravatar.cc/100");

  const fetchStats = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const provider = new JsonRpcProvider("https://testnet-rpc.monad.xyz");
      const balance = await provider.getBalance(address);
      setMon(formatEther(balance));

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
      const txDecimal = parseInt(txJson?.result || "0x0", 16);
      setTxCount(txDecimal.toString());

      let nftHeld = 0;
      for (const contractAddr of FEATURED_NFTS) {
        const res = await fetch(`${ALCHEMY_URL}/getNFTs?owner=${address}&contractAddresses[]=${contractAddr}`);
        const json = await res.json();
        if (json?.ownedNfts?.length > 0) nftHeld++;
      }
      setNftCount(nftHeld.toString());

      if (fid) {
        const farcasterRes = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
          { headers: { accept: "application/json", api_key: NEYNAR_KEY } }
        );
        const farcasterJson = await farcasterRes.json();
        const user = farcasterJson?.users?.[0];
        const followers = user?.follower_count || 0;
const pfp = user?.pfp_url;
setFollowerCount(followers.toString());

if (pfp && typeof pfp === "string" && pfp.startsWith("http")) {
  setPfpUrl(pfp);
} else {
  console.warn("⚠️ Invalid or missing profile picture URL");
}
      } else {
        setFollowerCount("0");
      }

      const contract = new Contract(DAMAGE_GAME_ADDRESS, damageGameABI, provider);
      try {
        const user = await contract.users(address);
        const total = BigInt(user.totalDamage || 0);
        const acc = BigInt(user.accumulatedDamage || 0);
        setDamage((total + acc).toString());
      } catch (err) {
        console.warn("⚠️ Could not fetch Total Damage:", err);
        setDamage("0");
      }

    } catch (err) {
      console.error("Error fetching stats:", err);
    }
    setLoading(false);
  };

  return (
    <div className="tab-content">
      <h2 className="mini-note">User Stats</h2>

      <div className="text-center" style={{ marginTop: "10px" }}>
        <img
          src={pfpUrl}
          alt="Profile"
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            border: "2px solid #68d3fc",
            marginBottom: "10px",
          }}
        />
      </div>

      <div style={{ paddingLeft: "20px", textAlign: "left" }}>
        <p className="mini-note">MON Balance: {mon}</p>
        <p className="mini-note">Wallet: {address || "—"}</p>
        <p className="mini-note">TX Counts: {txCount}</p>
        <p className="mini-note">Featured NFT Holdings: {nftCount}</p>
        <p className="mini-note">Farcaster Total Followers: {followerCount}</p>
        <p className="mini-note">Total Dealt Damages: {damage}</p>
      </div>

      <div className="text-center">
        <button className="pixel-button" onClick={fetchStats} style={{ marginTop: "10px" }}>
          Fetch Stats {loading && <span>(loading...)</span>}
        </button>
      </div>

<h2 className="mini-note" style={{ marginTop: "25px", fontSize: "14px" }}>
  In-game Information
</h2>

<ul className="mini-note" style={{ marginTop: "10px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Default Damage Stats</strong></li>
  <li>---</li>  
  <li>TX Hash: X damage per submitted TX hash (no cooldown except TX hash can only be submitted once)</li>
  <li>---</li>  
  <li>Stake: X damage per successful stake (once every 24hrs)</li>
  <li>---</li>  
  <li>Create Token: X damage per token creation (once every 7days)</li>
  <li>Per unique wallet address bought the token will give +5 damage to the creator (goes to accumulated damage)</li>
  <li>---</li>  
  <li>Create NFT: X damage per token creation (once every 7days)</li>
  <li>Per unique wallet address bought the NFT will give +5 damage to the creator (goes to accumulated damage)</li>
  <li>---</li>  
  <li>Cast (post on Farcaster): 20 damage per post (max 10 posts a day)</li>
  <li>Per Post Like: 1 damage each (goes to accumulated damage)</li>
  <li>Per Post Comment: 1 damage each (goes to accumulated damage)</li>
  <li>Per Post Qoutes: 1 damage each (goes to accumulated damage)</li>
  <li>---</li>  
  <li>Important Note: Submit Onchain Metadata in Boss Area tab to deal damage (not 0)</li>
</ul>

<ul className="mini-note" style={{ marginTop: "10px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>How to Start (Web browser/Warcast Desktop version):</strong></li>
  <li>---</li>  
  <li>1. Go to Warpcast/Farcaster ➟ Edit Profile</li>
  <li>2. Go to Verified Addresses</li> 
  <li>3. Click Verify Address</li>  
  <li>4. Connect and Confirm</li> 
  <li>5. Sign-in using Neynar</li>
  <li>---</li> 
  <li>Important Note: </li>
  <li>Before interacting in Boss Area make sure to do these two</li> 
  <li>1. For first time user, click "Refresh Damage" and wait until it fetch your onchain data and farcaster details.</li> 
  <li>2. Click "Submit Onchain Onchain" to record your current stats and damages. </li> 
  <li>---</li> 
  <li>For existing users, You can overwrite onchain data if you increase your previous stats.</li> 
</ul>

<ul className="mini-note" style={{ marginTop: "10px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Cast Feature - Guide:</strong></li>
  <li>---</li>  
  <li>1. Go to Farcaster and cast something </li>
  <li>2. After casting/posting click the three dots (...) on that post and copy the Cast Hash</li> 
  <li>3. Paste the Cast Hash in the "Paste your Cast Hash" box</li>  
  <li>4. Click "Generate Signature", it will automatically fill the next box</li>
  <li>5. Submit Cast Damage to deal damage to the boss. </li>
  <li>---</li>  
  <li>Note: Submitted Cast will get additional damage if the cast get Like, Comment, or Qoute</li>
</ul>

<ul className="mini-note" style={{ marginTop: "20px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Damage Calculations</strong></li>
  <li>---</li>  
  <li>TX Counts:</li>
  <li>0-200 tx counts = 20 Damage </li>
  <li>201-500 tx counts = 40 Damage</li>
  <li>501-800 tx counts = 60 Damage</li>  
  <li>801-1,000 tx counts = 80 Damage</li>
  <li>1001+ = 120 Damage</li>    
  <li>---</li>  
  <li>Farcaster Followers:</li>
  <li>0-10 followers = 20 Damage</li>
  <li>11-20 = 40 Damage</li>
  <li>21-40 = 60 Damage</li>  
  <li>41-99 = 80 Damage</li>
  <li>100+ = 120 Damage</li>    
  <li>---</li>
  <li>NFT Holdings: 50 damage to boss per featured NFT you're holding</li>
  <li>---</li>
  <li>Notes 💥</li>
  <li>Random X multiplier is applied to all attacks</li>
  <li>Stake, Create Token, and Cast can deal way more damage to bosses</li>
</ul>

<ul className="mini-note" style={{ marginTop: "20px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Boss</strong></li>
  <li>Users can activate "Spawn Boss" to spawn a new boss every 12hrs whether the users defeated them or not</li>
</ul>

<ul className="mini-note" style={{ marginTop: "20px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Leaderboard</strong></li>
  <li>---</li>  
  <li>Weekly Top 10 will be show real time (snapshot every 7 days)</li>
  <li>Monthly Top 3 will be show real time (snapshot every 30days)</li>
</ul>

<ul className="mini-note" style={{ marginTop: "20px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Rewards</strong></li>
  <li>Weekly Top 10 will receive rewards accordingly</li>
  <li>Top 1: 50 MON</li>
  <li>Top 2: 40 MON</li>
  <li>Top 3: 30 MON</li>
  <li>Top 4–10: 10 MON each</li>
  <li>---</li>
  <li>Monthly Top 3 will receive rewards accordingly</li>
  <li>Top 1: 200 MON</li>
  <li>Top 2: 150 MON</li>
  <li>Top 3: 100 MON</li>
</ul>
    </div>
  );
}