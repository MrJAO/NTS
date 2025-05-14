import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import damageGameAbi from './DamageGame.json' assert { type: 'json' };
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors({ origin: 'https://nts-sigma.vercel.app' }));
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, damageGameAbi, wallet);
console.log("🧾 Cast bot wallet address:", wallet.address);

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
  console.warn("❌ Invalid webhook signature:", req.headers['x-neynar-signature']);
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
console.log(`📥 New cast webhook received from ${ethAddress}, hash: ${castHash}`);
console.log(`🧾 Cast ID (hashed): ${castId.toString()}`);
} catch (err) {
  console.warn(`❌ Failed to apply cast damage:`, err.reason || err.message);
}

  res.sendStatus(200);
});

// ✅ Farcaster Sign-in Step 1 — using new Neynar endpoint
app.post('/api/farcaster/sign-in', async (req, res) => {
  try {
    console.log("🔍 NEYNAR_KEY:", process.env.NEYNAR_KEY?.slice(0, 5));

    const response = await fetch('https://api.neynar.com/v2/signer/signed-key-requests', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: 'nts-sigma.vercel.app'
      })
    });

    const data = await response.json();
    console.log("📦 Sign-In Response:", data);

    if (!data.message || !data.request_fid) {
      throw new Error('Missing message or request_fid');
    }

    res.json({ message: data.message, request_fid: data.request_fid });
  } catch (err) {
    console.error('❌ Error initiating Farcaster sign-in:', err);
    res.status(500).json({ error: 'Sign-in initiation failed' });
  }
});

// ✅ Farcaster Sign-in Step 2 — using new Neynar verify endpoint
app.post('/api/farcaster/verify', async (req, res) => {
  const { request_fid, signed_message } = req.body;

  try {
    const response = await fetch('https://api.neynar.com/v2/signer/signed-key-requests/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'api_key': process.env.NEYNAR_KEY
      },
      body: JSON.stringify({ request_fid, signed_message })
    });

    const data = await response.json();
    console.log("📦 Verify Response:", data);

    const { fid, username } = data?.user || {};
    if (!fid || !username) {
      throw new Error('Missing user info');
    }

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
