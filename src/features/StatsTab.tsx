import { useState } from "react";
import { useAccount } from "wagmi";
import { JsonRpcProvider, formatEther } from "ethers";

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
  "0x6ed438b2a8eff227e7e54b5324926941b140eea0",
  "0x800f8cacc990dda9f4b3f1386c84983ffb65ce94",
  "0x209fb14943e9412354e982c4784bf89df760bf8f"
];

export default function StatsTab() {
  const { address } = useAccount();
  const [mon, setMon] = useState("-");
  const [txCount, setTxCount] = useState("-");
  const [nftCount, setNftCount] = useState("-");
  const [damage, setDamage] = useState("-");
  const [multiplier, setMultiplier] = useState("-");
  const [followerCount, setFollowerCount] = useState("-");
  const [loading, setLoading] = useState(false);

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
      for (const contract of FEATURED_NFTS) {
        const res = await fetch(`${ALCHEMY_URL}/getNFTs?owner=${address}&contractAddresses[]=${contract}`);
        const json = await res.json();
        if (json?.ownedNfts?.length > 0) nftHeld++;
      }
      setNftCount(nftHeld.toString());

      const farcasterRes = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
        headers: { accept: "application/json", api_key: NEYNAR_KEY }
      });
      const farcasterJson = await farcasterRes.json();
      const followers = farcasterJson?.users?.[0]?.follower_count || 0;
      setFollowerCount(followers.toString());

      let txMult = 0, nftMult = nftHeld * 0.5, followMult = 0;
      if (txDecimal >= 1001) txMult = 1.2;
      else if (txDecimal >= 801) txMult = 0.8;
      else if (txDecimal >= 501) txMult = 0.6;
      else if (txDecimal >= 201) txMult = 0.4;
      else if (txDecimal >= 1)   txMult = 0.2;

      if (followers >= 100) followMult = 1.2;
      else if (followers >= 41) followMult = 0.8;
      else if (followers >= 21) followMult = 0.6;
      else if (followers >= 11) followMult = 0.4;
      else if (followers >= 1)  followMult = 0.2;

      const finalMult = txMult + nftMult + followMult;
      setMultiplier("x" + finalMult.toFixed(2));
      setDamage("0");
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
          src="https://i.pravatar.cc/100"
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
        <p className="mini-note">Username: MrJAO</p>
        <p className="mini-note">MON Balance: {mon}</p>
        <p className="mini-note">Wallet: {address || "—"}</p>
        <p className="mini-note">TX Counts: {txCount}</p>
        <p className="mini-note">Featured NFT Holdings: {nftCount}</p>
        <p className="mini-note">Farcaster Total Followers: {followerCount}</p>        
        <p className="mini-note">Total Dealt Damages: {damage}</p>
        <p className="mini-note">Damage Multiplier: {multiplier}</p>
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
  <li>TX Hash: 5 dmg per TX (unique)</li>
  <li>Stake: 10 dmg per 24h</li>
  <li>Create Token: 20 dmg (weekly), +5 per buyer</li>
  <li>Create NFT: 20 dmg (weekly), +5 per buyer</li>
  <li>Cast: 20 dmg/post (max 10/day), +1 per like/comment/quote</li>
  <li>Note: A hidden random +damage will automatically applied even on transaction without multipliers</li>
</ul>

<h2 className="mini-note" style={{ marginTop: "25px", fontSize: "14px" }}>
  In-game Information
</h2>
<ul className="mini-note" style={{ marginTop: "10px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Default Damage Stats</strong></li>
  <li>---</li>  
  <li>TX Hash: 5 damage per submitted TX hash (default damage, no cooldown except TX hash can only be submitted once)</li>
  <li>---</li>  
  <li>Stake: 10 damage per successful stake (default damage, once every 24hrs)</li>
  <li>---</li>  
  <li>Create Token: 20 damage per token creation (default damage, once every 7days)</li>
  <li>Per unique wallet address bought the token will give +5 damage to the creator (goes to accumulated damage)</li>
  <li>---</li>  
  <li>Create NFT: 20 damage per token creation (default damage, once every 7days)</li>
  <li>Per unique wallet address bought the NFT will give +5 damage to the creator (goes to accumulated damage)</li>
  <li>---</li>  
  <li>Cast (post on Farcaster): 20 damage per post (default damage, max 10 posts a day)</li>
  <li>Per Post Like: 1 damage each (goes to accumulated damage)</li>
  <li>Per Post Comment: 1 damage each (goes to accumulated damage)</li>
  <li>Per Post Qoutes: 1 damage each (goes to accumulated damage)</li>
</ul>

<ul className="mini-note" style={{ marginTop: "20px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Damage Multiplier (Additional damage base on the met multiplier)</strong></li>
  <li>---</li>  
  <li>TX Counts:</li>
  <li>0-200 tx counts = x0.2 multiplier to boss damage</li>
  <li>201-500 tx counts = x0.4 multiplier to boss damage</li>
  <li>501-800 tx counts = x0.6 multiplier to boss damage</li>  
  <li>801-1,000 tx counts = x0.8 multiplier to boss damage</li>
  <li>1001+ = x1.2 multiplier to boss damage</li>    
  <li>---</li>  
  <li>Farcaster Followers:</li>
  <li>0-10 followers = x0.2 multiplier to boss damage</li>
  <li>11-20 = x0.4 multiplier to boss damage</li>
  <li>21-40 = x0.6 multiplier to boss damage</li>  
  <li>41-99 = x0.8 multiplier to boss damage</li>
  <li>100+ = x1.2 multiplier to boss damage</li>    
  <li>---</li>
  <li>NFT Holdings: x0.5 multiplier to boss damage per featured NFT you're holding</li>
</ul>

<ul className="mini-note" style={{ marginTop: "20px", paddingLeft: "20px", textAlign: "left" }}>
  <li><strong>Boss</strong></li>
  <li>Boss will spawn/respawn every 24hrs whether the users defeated them or not</li>
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