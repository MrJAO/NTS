import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

type LeaderboardEntry = {
  address: string;
  total_damage: string;
  accumulated_damage: string;
  combined_damage: string;
  weekly_delta?: string;
  monthly_delta?: string;
  rank?: number;
};

export default function LeaderboardTab() {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly" | "live">("weekly");
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([]);
  const [monthly, setMonthly] = useState<LeaderboardEntry[]>([]);
  const [live, setLive] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextWeeklySnapshot, setNextWeeklySnapshot] = useState("—");
  const [nextMonthlySnapshot, setNextMonthlySnapshot] = useState("—");
  const { address: currentAddress } = useAccount();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, m, l] = await Promise.all([
        fetch("https://nts-production.up.railway.app/api/leaderboard/snapshot/weekly").then(res => res.json()),
        fetch("https://nts-production.up.railway.app/api/leaderboard/snapshot/monthly").then(res => res.json()),
        fetch("https://nts-production.up.railway.app/api/leaderboard").then(res => res.json())
      ]);
      setWeekly(w);
      setMonthly(m);
      setLive(l.weekly);
      calculateSnapshotCountdowns(w, m);
    } catch (err) {
      console.error("Failed to fetch leaderboard data:", err);
    }
    setLoading(false);
  };

  const calculateSnapshotCountdowns = (weeklyData: any[], monthlyData: any[]) => {
    const getNextTime = (last: Date, days: number) =>
      new Date(last.getTime() + days * 24 * 60 * 60 * 1000);

    const getCountdown = (next: Date) => {
      const now = new Date();
      const diff = Math.max(0, next.getTime() - now.getTime());
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${hours}hr ${minutes}mins ${seconds}s`;
    };

    let weeklyInterval: NodeJS.Timeout;
    let monthlyInterval: NodeJS.Timeout;

    if (weeklyData?.length) {
      const weeklyNext = getNextTime(new Date(weeklyData[0].snapshot_time), 7);
      weeklyInterval = setInterval(() => {
        setNextWeeklySnapshot(getCountdown(weeklyNext));
      }, 1000);
    }

    if (monthlyData?.length) {
      const monthlyNext = getNextTime(new Date(monthlyData[0].snapshot_time), 30);
      monthlyInterval = setInterval(() => {
        setNextMonthlySnapshot(getCountdown(monthlyNext));
      }, 1000);
    }

    return () => {
      clearInterval(weeklyInterval);
      clearInterval(monthlyInterval);
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const shorten = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

  const renderList = (data: LeaderboardEntry[], showDelta = false) => (
    <table className="mini-note" style={{ width: "100%", marginTop: "10px", fontSize: "11px" }}>
      <thead>
        <tr>
          <th>#</th>
          <th>Wallet</th>
          <th>Total</th>
          {showDelta && <th>Weekly Δ</th>}
          {showDelta && <th>Monthly Δ</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((entry, i) => {
          const isYou = currentAddress?.toLowerCase() === entry.address.toLowerCase();
          return (
            <tr
              key={entry.address}
              style={isYou ? { backgroundColor: "#222", fontWeight: "bold" } : {}}
            >
              <td>{entry.rank || i + 1}</td>
              <td>{isYou ? `🧍 ${shorten(entry.address)}` : shorten(entry.address)}</td>
              <td>{entry.combined_damage}</td>
              {showDelta && <td>{entry.weekly_delta}</td>}
              {showDelta && <td>{entry.monthly_delta}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="tab-content text-center">
      <p className="mini-note" style={{ marginBottom: "6px" }}>
        ⏱️ Next Weekly Snapshot: {nextWeeklySnapshot}
      </p>
      <p className="mini-note" style={{ marginBottom: "12px" }}>
        📆 Next Monthly Snapshot: {nextMonthlySnapshot}
      </p>

      <div style={{ marginBottom: "10px" }}>
        <button className="pixel-button" onClick={() => setActiveTab("weekly")}>🏆 Weekly</button>
        <button className="pixel-button" onClick={() => setActiveTab("monthly")}>📆 Monthly</button>
        <button className="pixel-button" onClick={() => setActiveTab("live")}>⚡ Live</button>
      </div>

      {loading && <p className="mini-note">Loading leaderboard...</p>}
      {!loading && activeTab === "weekly" && renderList(weekly)}
      {!loading && activeTab === "monthly" && renderList(monthly)}
      {!loading && activeTab === "live" && renderList(live, true)}
    </div>
  );
}
