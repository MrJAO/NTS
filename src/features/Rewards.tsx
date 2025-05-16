import { useEffect, useState } from "react";
import { ethers } from "ethers";

type RewardEntry = {
  address: string;
  combined_damage: string;
  rank: number;
};

const shorten = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);
const WALLET_ADDRESS = "0xd9F016e453dE48D877e3f199E8FA4aADca2E979C";

export default function RewardsTab() {
  const [weekly, setWeekly] = useState<RewardEntry[]>([]);
  const [monthly, setMonthly] = useState<RewardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [poolBalance, setPoolBalance] = useState("—");

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const [w, m] = await Promise.all([
        fetch("https://nts-production.up.railway.app/api/leaderboard/snapshot/weekly").then(res => res.json()),
        fetch("https://nts-production.up.railway.app/api/leaderboard/snapshot/monthly").then(res => res.json())
      ]);
      setWeekly(w.map((entry: any, i: number) => ({ ...entry, rank: i + 1 })));
      setMonthly(m.map((entry: any, i: number) => ({ ...entry, rank: i + 1 })));
    } catch (err) {
      console.error("Failed to fetch rewards:", err);
    }
    setLoading(false);
  };

  const fetchPoolBalance = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
      const balance = await provider.getBalance(WALLET_ADDRESS);
      setPoolBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      setPoolBalance("0");
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchPoolBalance();
  }, []);

  const getWeeklyPrize = (rank: number) => {
    if (rank === 1) return "🥇 50 MON";
    if (rank === 2) return "🥈 40 MON";
    if (rank === 3) return "🥉 30 MON";
    if (rank >= 4 && rank <= 10) return "🏅 10 MON";
    return "-";
  };

  const getMonthlyPrize = (rank: number) => {
    if (rank === 1) return "🥇 200 MON";
    if (rank === 2) return "🥈 150 MON";
    if (rank === 3) return "🥉 100 MON";
    return "-";
  };

  const renderTable = (title: string, data: RewardEntry[], prizeFn: (rank: number) => string) => (
    <>
      <h3 className="mini-note" style={{ marginTop: "20px" }}>{title}</h3>
      <table className="mini-note" style={{ width: "100%", marginTop: "10px", fontSize: "11px" }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            <th>Total</th>
            <th>Reward</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.address}>
              <td>{entry.rank}</td>
              <td>{shorten(entry.address)}</td>
              <td>{entry.combined_damage}</td>
              <td>{prizeFn(entry.rank)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  return (
    <div className="tab-content text-center">
      <p className="mini-note" style={{ marginBottom: "10px" }}>
        🎁 Pool Balance: {poolBalance} MON
      </p>

      <div style={{ marginBottom: "14px" }}>
        <button
          className="pixel-button"
          style={{ marginRight: "6px" }}
          onClick={() =>
            navigator.clipboard.writeText(
              weekly.slice(0, 10).map(e => e.address).join("\n")
            )
          }
        >
          📋 Copy Weekly Winners
        </button>
        <button
          className="pixel-button"
          onClick={() =>
            navigator.clipboard.writeText(
              monthly.slice(0, 3).map(e => e.address).join("\n")
            )
          }
        >
          📋 Copy Monthly Winners
        </button>
      </div>

      {loading && <p className="mini-note">Loading rewards...</p>}
      {!loading && renderTable("🏆 Weekly Rewards", weekly, getWeeklyPrize)}
      {!loading && renderTable("📆 Monthly Rewards", monthly, getMonthlyPrize)}
    </div>
  );
}
