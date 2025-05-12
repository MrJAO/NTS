import { useAccount, useWriteContract } from "wagmi";
import damageGameABI from "../../abis/DamageGame.json";

const DAMAGE_GAME_ADDRESS = "0x3638D6aC0EC8081d6241DF9Dd95Da6c1BcF9d538";
const BOT_ADDRESS = "0xd9F016e453dE48D877e3f199E8FA4aADca2E979C";

export default function AdminTab() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const handleSetBot = async () => {
    try {
      await writeContractAsync({
        address: DAMAGE_GAME_ADDRESS,
        abi: damageGameABI,
        functionName: "setBotAddress",
        args: [BOT_ADDRESS],
      });
      alert("✅ Bot address set!");
    } catch (err) {
      console.error("❌ Failed to set bot:", err);
      alert("❌ Set bot address failed");
    }
  };

  return (
    <div className="tab-content">
      <h2 className="mini-note">Admin: Set Bot</h2>
      <p className="mini-note">Connected Wallet: {address}</p>
      <button className="pixel-button" onClick={handleSetBot}>
        Set Bot Address
      </button>
    </div>
  );
}
