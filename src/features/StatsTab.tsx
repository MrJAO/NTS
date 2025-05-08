export default function StatsTab() {
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
        <p className="mini-note">MON Balance: 1,234</p>
        <p className="mini-note">Wallet: 0xABC...1234</p>
        <p className="mini-note">Total Dealt Damages: 4,200</p>
        <p className="mini-note">Damage Multiplier: x1.2</p>
      </div>

      <div className="text-center">
        <button className="pixel-button" style={{ marginTop: "10px" }}>
          Fetch Stats
        </button>
      </div>

      <h2 className="mini-note" style={{ marginTop: "25px", fontSize: "14px" }}>
        In-game Information
      </h2>
      <ul
        className="mini-note"
        style={{ marginTop: "10px", paddingLeft: "20px", textAlign: "left" }}
      >
        <li>TX Hash: 5 dmg per TX (unique)</li>
        <li>Stake: 10 dmg per 24h</li>
        <li>Create Token: 20 dmg (weekly), +5 per buyer</li>
        <li>Create NFT: 20 dmg (weekly), +5 per buyer</li>
        <li>Cast: 20 dmg/post (max 10/day), +1 per like/comment/quote</li>
      </ul>

      <h3 className="mini-note" style={{ marginTop: "20px", fontSize: "13px" }}>
        Damage Multiplier:
      </h3>
      <ul
        className="mini-note"
        style={{ paddingLeft: "20px", textAlign: "left" }}
      >
        <li>TX Count: x0.2 → x1.2 scaling</li>
        <li>Farcaster Followers: x0.2 → x1.2 scaling</li>
        <li>NFT Holdings: x0.5 per featured NFT</li>
      </ul>
    </div>
  );
}
