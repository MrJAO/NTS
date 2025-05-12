import express from 'express';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import damageGameAbi from './DamageGame.json' assert { type: 'json' }; // drop ABI here

dotenv.config();

const app = express();
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, damageGameAbi, wallet);

app.post('/api/neynar-cast', async (req, res) => {
  const cast = req.body.data;
  const ethAddress = cast?.author?.verified_addresses?.eth_addresses?.[0];
  const castHash = cast?.hash;

  if (!ethAddress || !castHash) return res.sendStatus(200);

  try {
    const castId = ethers.getBigInt(ethers.id(castHash));
    const tx = await contract.registerCast(ethAddress, castId);
    await tx.wait();
    console.log(`✅ Damage applied from webhook cast: ${tx.hash}`);
  } catch (err) {
    console.warn(`❌ Failed to apply cast damage:`, err.reason || err.message);
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('Cast Trigger Backend Running'));
app.listen(process.env.PORT, () =>
  console.log(`🔊 Listening on http://localhost:${process.env.PORT}`)
);
