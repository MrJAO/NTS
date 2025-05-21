# NTS – Boss Battle

**Official Links:**  
Web Application: https://nts-sigma.vercel.app/  
Warpcast (desktop/mobile): https://warpcast.com/miniapps/roBFYu5D0M_h/nts-boss-battle

---

### <div align="center">Features and Information</div>

---

### Working Features (Warpcast Desktop Version):

**Boss Area Tab**

**• Refresh Damage (runs in backend)**  
– Fetches onchain and Farcaster data (TX count, NFT holdings, and connected user follower count)  

**• Submit Onchain Data**  
– Records user data to the smart contract  
– Triggers calculations for user damage  

> *These two are required for new users before interacting with other Boss Area features*

**• Spawn Boss**  
– Users can spawn a new boss every 12 hours, even if not defeated  
> *Originally automatic but now requires user interaction for more onchain engagement*

**• TX Hash**  
– Submit valid TX hashes from other Farcaster games or dApps on Monad Testnet  
– Each submission deals X damage to the boss  

**• Stake**  
– Stake MON to aprMON to deal more damage  
> *24-hour cooldown*

**• Create Token**  
– Create your own token and deal more damage  
– Bonus: other users holding your token add to accumulated damage  
> *7-day cooldown*

**• Cast**  
– Submit your Cast hash to deal highest damage  
– Bonus: Likes, Comments, and Quotes contribute to accumulated damage  

> *Note: TX Hash and Cast feature limits removed for testing*

---

**Stats Tab: Fetch Stats**  
– Displays onchain data including total and submitted user stats

---

### Working Features (Farcaster App Version):

– **Cast Feature** (if using same wallet as desktop)  
– **Stats Tab: Fetch Stats**

> *The rest of desktop features would work here, but chain switching issues in Farcaster App prevent proper usage.*

---

### Pending:

– **Create NFT**  
– **Leaderboard & Rewards tabs:** Backends working, frontend not yet wired (check `index.mjs`)

---

### In-game Guides

**How to Start (Web browser/Warpcast Desktop version):**  
–––  
1. Go to Warpcast/Farcaster ➟ Edit Profile  
2. Go to Verified Addresses  
3. Click Verify Address  
4. Connect and Confirm  
5. Sign-in using Neynar  
–––  
**Important Note:**  
Before using Boss Area:  
1. Click “Refresh Damage” to fetch your data  
2. Click “Submit Onchain Data” to record it  
–––  
Existing users can overwrite their data if stats improve

---

**Cast Feature - Guide:**  
–––  
1. Go to Farcaster and cast a post  
2. Click the three dots (...) and copy the Cast Hash  
3. Paste it into the “Paste your Cast Hash” box  
4. Click “Generate Signature”  
5. Submit to deal damage  
–––  
*Note: Likes, Comments, and Quotes on Cast increase damage*