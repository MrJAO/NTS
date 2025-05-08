import { useState } from "react";

export default function BossAreaTab() {
  const [activeBoss] = useState("Overgas");
  const [health] = useState(200000);
  const maxHealth = 200000;
  const [activeTab, setActiveTab] = useState<'tx' | 'stake' | 'create' | 'nft' | 'cast'>('tx');

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

  return (
    <div className="tab-content">
      <h2 className="mini-note" style={{ fontSize: "14px", textAlign: "center", marginBottom: "10px" }}>
        {activeBoss}
      </h2>

      <div className="health-bar-container">
        <div className="health-bar" style={{ width: `${(health / maxHealth) * 100}%` }}></div>
      </div>

      <p className="mini-note boss-health-count">
        {health.toLocaleString()} / {maxHealth.toLocaleString()}
      </p>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <img src={getBossGif(activeBoss)} alt="Boss GIF" className="boss-gif" />
      </div>

      <div className="roast-box" style={{ fontSize: "12px" }}>
        "You're no match for me, MrJAO!"
      </div>

      <div className="timer">Next Boss spawning in: 11hr 59mins 59secs</div>
      <div className="multiplier">Your Damage Multiplier: x1.2</div>

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
