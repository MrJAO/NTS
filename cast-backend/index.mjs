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

async function initTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS weekly_snapshots (
      snapshot_id SERIAL PRIMARY KEY,
      snapshot_time TIMESTAMP DEFAULT NOW(),
      rank INTEGER,
      eth_address TEXT UNIQUE,
      total_damage TEXT,
      accumulated_damage TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS monthly_snapshots (
      snapshot_id SERIAL PRIMARY KEY,
      snapshot_time TIMESTAMP DEFAULT NOW(),
      rank INTEGER,
      eth_address TEXT UNIQUE,
      total_damage TEXT,
      accumulated_damage TEXT
    )
  `);
}
initTables().catch(console.error);

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

// 🔁 Snapshot leaderboard every 6 hours (check if due)
setInterval(async () => {
  const now = new Date();

  const { rows: users } = await db.query('SELECT DISTINCT eth_address FROM cast_submissions WHERE eth_address IS NOT NULL');
  const userAddresses = users.map(u => u.eth_address);

  const storeSnapshot = async (tableName) => {
    console.log(`🗂️ Taking ${tableName} snapshot...`);
    for (const addr of userAddresses) {
      try {
        const stats = await contract.fetchUserStats(addr);
        const total = BigInt(stats[1]);
        const acc = BigInt(stats[2]);

        await db.query(
          `INSERT INTO ${tableName} (eth_address, total_damage, accumulated_damage, snapshot_time)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (eth_address) DO UPDATE SET
             total_damage = EXCLUDED.total_damage,
             accumulated_damage = EXCLUDED.accumulated_damage,
             snapshot_time = NOW()`,
          [addr, total.toString(), acc.toString()]
        );
      } catch (err) {
        console.warn(`⚠️ Snapshot failed for ${addr}:`, err.message || err);
      }
    }
  };

  // Check if weekly snapshot is due
  const lastWeekly = await db.query('SELECT snapshot_time FROM weekly_snapshots ORDER BY snapshot_time DESC LIMIT 1');
  const weeklyDue = !lastWeekly.rows[0] || (now - new Date(lastWeekly.rows[0].snapshot_time)) > 7 * 24 * 60 * 60 * 1000;
  if (weeklyDue) await storeSnapshot('weekly_snapshots');

  // Check if monthly snapshot is due
  const lastMonthly = await db.query('SELECT snapshot_time FROM monthly_snapshots ORDER BY snapshot_time DESC LIMIT 1');
  const monthlyDue = !lastMonthly.rows[0] || (now - new Date(lastMonthly.rows[0].snapshot_time)) > 30 * 24 * 60 * 60 * 1000;
  if (monthlyDue) await storeSnapshot('monthly_snapshots');

}, 6 * 60 * 60 * 1000); // every 6 hours

// ✅ Live Leaderboard with Snapshot Delta
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT DISTINCT eth_address FROM cast_submissions WHERE eth_address IS NOT NULL');
    const userAddresses = rows.map(r => r.eth_address);

    const leaderboardData = [];

    for (const addr of userAddresses) {
      let stats;
      try {
        stats = await contract.fetchUserStats(addr);
      } catch {
        // silently skip addresses that revert (uninitialized or inactive users)
        continue;
      }

      try {
        const total = BigInt(stats[1]);
        const acc = BigInt(stats[2]);
        const combined = total + acc;

        const { rows: weeklySnap } = await db.query(`
          SELECT total_damage, accumulated_damage 
          FROM weekly_snapshots 
          WHERE eth_address = $1 
          LIMIT 1
        `, [addr]);

        const weeklyTotal = BigInt(weeklySnap[0]?.total_damage || '0');
        const weeklyAcc = BigInt(weeklySnap[0]?.accumulated_damage || '0');
        const weeklySnapshot = weeklyTotal + weeklyAcc;
        const weeklyDelta = combined - weeklySnapshot;

        const { rows: monthlySnap } = await db.query(`
          SELECT total_damage, accumulated_damage 
          FROM monthly_snapshots 
          WHERE eth_address = $1 
          LIMIT 1
        `, [addr]);

        const monthlyTotal = BigInt(monthlySnap[0]?.total_damage || '0');
        const monthlyAcc = BigInt(monthlySnap[0]?.accumulated_damage || '0');
        const monthlySnapshot = monthlyTotal + monthlyAcc;
        const monthlyDelta = combined - monthlySnapshot;

        leaderboardData.push({
          address: addr,
          total_damage: total.toString(),
          accumulated_damage: acc.toString(),
          combined_damage: combined.toString(),
          weekly_delta: weeklyDelta.toString(),
          monthly_delta: monthlyDelta.toString()
        });
      } catch (err) {
        console.warn(`⚠️ Could not fully process leaderboard entry for ${addr}:`, err.message || err);
      }
    }

    leaderboardData.sort((a, b) => BigInt(b.combined_damage) - BigInt(a.combined_damage));

    res.json({
      weekly: leaderboardData.slice(0, 10),
      monthly: leaderboardData.slice(0, 3)
    });
  } catch (err) {
    console.error("❌ Failed to build live leaderboard with deltas:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Weekly Snapshot Leaderboard
app.get('/api/leaderboard/snapshot/weekly', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT *, 
        (CAST(total_damage AS NUMERIC) + CAST(accumulated_damage AS NUMERIC)) AS combined_damage
      FROM weekly_snapshots
      ORDER BY combined_damage DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to fetch weekly snapshot leaderboard:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Monthly Snapshot Leaderboard
app.get('/api/leaderboard/snapshot/monthly', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT *, 
        (CAST(total_damage AS NUMERIC) + CAST(accumulated_damage AS NUMERIC)) AS combined_damage
      FROM monthly_snapshots
      ORDER BY combined_damage DESC
      LIMIT 3
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Failed to fetch monthly snapshot leaderboard:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// StoreSnapshot for Sorting
const storeSnapshot = async (tableName) => {
  console.log(`🗂️ Taking ${tableName} snapshot...`);

  const { rows: users } = await db.query('SELECT DISTINCT eth_address FROM cast_submissions WHERE eth_address IS NOT NULL');
  const userAddresses = users.map(u => u.eth_address);

  const leaderboardData = [];

  for (const addr of userAddresses) {
    try {
      const stats = await contract.fetchUserStats(addr);
      const total = BigInt(stats[1]);
      const acc = BigInt(stats[2]);
      leaderboardData.push({
        address: addr,
        total,
        acc,
        combined: total + acc
      });
    } catch (err) {
      console.warn(`⚠️ Snapshot fetch failed for ${addr}:`, err.message || err);
    }
  }

  // Sort and assign ranks
  leaderboardData.sort((a, b) => b.combined - a.combined);

  for (let i = 0; i < leaderboardData.length; i++) {
    const { address, total, acc } = leaderboardData[i];
    const rank = i + 1;

    try {
      await db.query(
        `INSERT INTO ${tableName} (eth_address, total_damage, accumulated_damage, snapshot_time, rank)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT (eth_address)
         DO UPDATE SET 
           total_damage = EXCLUDED.total_damage,
           accumulated_damage = EXCLUDED.accumulated_damage,
           snapshot_time = NOW(),
           rank = EXCLUDED.rank`,
        [address, total.toString(), acc.toString(), rank]
      );
    } catch (err) {
      console.warn(`⚠️ Snapshot insert failed for ${address}:`, err.message || err);
    }
  }

  console.log(`✅ Snapshot stored to ${tableName} with ${leaderboardData.length} users`);
};

app.get('/', (req, res) => res.send('Cast Trigger Backend Running'));

app.listen(process.env.PORT, () =>
  console.log(`🔊 Listening on http://localhost:${process.env.PORT}`)
);
