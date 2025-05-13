import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import damageGameAbi from './DamageGame.json' assert { type: 'json' };
import cors from 'cors';

dotenv.config();

const app = express();      // ✅ declare first
app.use(cors({ origin: 'https://nts-sigma.vercel.app' }));
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, damageGameAbi, wallet);

// 🔒 Verify Neynar webhook signature
function isValidSignature(req) {
  const secret = process.env.WEBHOOK_SECRET;
  const signature = req.headers['x-neynar-signature'];
  const rawBody = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === hash;
}

// ✅ Cast webhook handler
app.post('/api/neynar-cast', async (req, res) => {
  if (!isValidSignature(req)) {
    console.warn("❌ Invalid webhook signature");
    return res.sendStatus(401);
  }

  const cast = req.body.data;
  const castHash = cast?.hash;
  const ethAddress = cast?.author?.verified_addresses?.eth_addresses?.[0];

  if (!ethAddress || !castHash) {
    console.warn("❌ Missing ethAddress or castHash");
    return res.sendStatus(200);
  }

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

// ✅ Farcaster Sign-in Step 1
app.get('/api/farcaster/sign-in', async (req, res) => {
  try {
    const response = await fetch('https://api.neynar.com/v2/farcaster/sign-in', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_KEY
      }
    });
    const data = await response.json();
    console.log("🔍 Neynar sign-in response:", data); // add this line
    res.json(data);
  } catch (err) {
    console.error('❌ Error requesting signer_uuid:', err);
    res.status(500).json({ error: 'Failed to get signer_uuid' });
  }
});

// ✅ Farcaster Sign-in Step 2
app.post('/api/farcaster/verify', async (req, res) => {
  const { signer_uuid, signed_message } = req.body;

  try {
    const response = await fetch('https://api.neynar.com/v2/farcaster/signed-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_KEY
      },
      body: JSON.stringify({ signer_uuid, signed_message })
    });

    const data = await response.json();
    const { fid, username } = data.result.user;

    res.json({ fid, username });
  } catch (err) {
    console.error('❌ Error verifying signed message:', err);
    res.status(500).json({ error: 'Failed to verify signature' });
  }
});

app.get('/', (req, res) => res.send('Cast Trigger Backend Running'));

app.listen(process.env.PORT, () =>
  console.log(`🔊 Listening on http://localhost:${process.env.PORT}`)
);