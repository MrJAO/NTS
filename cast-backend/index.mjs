import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import damageGameAbi from './DamageGame.json' assert { type: 'json' };
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(cors({ origin: 'https://nts-sigma.vercel.app' }));
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const wallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, damageGameAbi, wallet);
console.log("🧾 Cast bot wallet address:", wallet.address);

// ✅ Setup Postgres
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Fix cast_submissions.created_at default and backfill existing nulls
const fixCreatedAt = async () => {
  try {
    await db.query(`ALTER TABLE cast_submissions ALTER COLUMN created_at SET DEFAULT NOW()`);
    await db.query(`UPDATE cast_submissions SET created_at = NOW() WHERE created_at IS NULL`);
    console.log("✅ created_at default and data backfilled.");
  } catch (err) {
    console.warn("⚠️ created_at patch skipped or already applied:", err.message);
  }
};
fixCreatedAt();

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
    console.log("📡 Attempting to call registerCast with:", ethAddress, castId.toString());

    const tx = await contract.registerCast(ethAddress, castId);
    await tx.wait();

    await db.query(
      'INSERT INTO cast_submissions (cast_hash, eth_address) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [castHash, ethAddress]
    );

    console.log(`📥 New cast webhook received from ${ethAddress}, hash: ${castHash}`);
    console.log(`🧾 Cast ID (hashed): ${castId.toString()}`);
    console.log(`✅ Damage applied from webhook cast: ${tx.hash}`);
  } catch (err) {
    console.warn("❌ Failed to apply cast damage:", err.reason || err.message || err);
  }

  res.sendStatus(200);
});

// ✅ Scheduled job to apply engagement damage
setInterval(async () => {
  console.log("⏱️ Running engagement poll...");

  try {
    const { rows } = await db.query('SELECT cast_hash, eth_address FROM cast_submissions ORDER BY created_at DESC LIMIT 50');

    for (const row of rows) {
      const { cast_hash, eth_address } = row;
      const castId = ethers.getBigInt(ethers.id(cast_hash));
      const engagementTypes = ['like', 'reply', 'recast'];

      for (const type of engagementTypes) {
        try {
          const res = await fetch(`https://api.neynar.com/v2/farcaster/cast/${cast_hash}/interactions?type=${type}`, {
            headers: { accept: 'application/json', api_key: process.env.NEYNAR_KEY }
          });
          const json = await res.json();
          const interactions = json?.interactions || [];

          for (const item of interactions) {
            const engager = item?.fid_address || item?.user?.verified_addresses?.eth_addresses?.[0];
            if (!engager) continue;

            try {
              const tx = await contract.recordCastEngagement(castId, type, engager);
              await tx.wait();
              console.log(`✅ Engagement: ${type} by ${engager} on ${cast_hash}`);
            } catch (err) {
              console.warn(`⚠️ Engagement already counted or failed: ${type} by ${engager}`, err.reason || err.message || err);
            }
          }
        } catch (err) {
          console.warn(`❌ Failed fetching interactions for type ${type} on ${cast_hash}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("❌ Engagement poll failed:", err);
  }
}, 5 * 60 * 1000); // Run every 5 mins

// ✅ Claim accumulated damage manually
app.post('/api/claim-accumulated', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing address' });

  try {
    const tx = await contract.applyDamage(address, 0); // base=0 means use accumulated
    await tx.wait();
    console.log(`✅ Claimed accumulated damage for ${address}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to claim accumulated damage:', err.reason || err.message || err);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// ✅ Farcaster Sign-in Step 1 — using new Neynar endpoint
app.post('/api/farcaster/sign-in', async (req, res) => {
  try {
    const response = await fetch('https://api.neynar.com/v2/signer/signed-key-requests', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        api_key: process.env.NEYNAR_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain: 'nts-sigma.vercel.app' })
    });

    const data = await response.json();
    if (!data.message || !data.request_fid) {
      throw new Error('Missing message or request_fid');
    }

    res.json({ message: data.message, request_fid: data.request_fid });
  } catch (err) {
    res.status(500).json({ error: 'Sign-in initiation failed' });
  }
});

// ✅ Farcaster Sign-in Step 2 — verify
app.post('/api/farcaster/verify', async (req, res) => {
  const { request_fid, signed_message } = req.body;

  try {
    const response = await fetch('https://api.neynar.com/v2/signer/signed-key-requests/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        api_key: process.env.NEYNAR_KEY
      },
      body: JSON.stringify({ request_fid, signed_message })
    });

    const data = await response.json();
    const { fid, username } = data?.user || {};
    if (!fid || !username) {
      throw new Error('Missing user info');
    }

    res.json({ fid, username });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify signature' });
  }
});

// ✅ Manual cast hash signature
app.post('/api/sign-cast', (req, res) => {
  const { hash, ethAddress } = req.body;

  if (!hash || !ethAddress) {
    return res.status(400).json({ error: 'Missing hash or ethAddress' });
  }

  const rawBody = JSON.stringify({
    data: {
      hash,
      author: {
        verified_addresses: {
          eth_addresses: [ethAddress]
        }
      }
    }
  });

  const signature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  res.json({ signature });
});

app.get('/', (req, res) => res.send('Cast Trigger Backend Running'));

app.listen(process.env.PORT, () =>
  console.log(`🔊 Listening on http://localhost:${process.env.PORT}`)
);
