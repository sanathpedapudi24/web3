# How to Run InvoiceFi - Complete Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Local Development (No Testnet)](#local-development)
4. [Deployment to Polygon Mumbai](#deployment-to-polygon-mumbai)
5. [Running the Full Application](#running-the-full-application)
6. [Demo Flow](#demo-flow)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
1. **Node.js 18+** - Download from https://nodejs.org/
   ```bash
   node --version  # Should show v18.x or higher
   ```

2. **Git** - https://git-scm.com/

3. **MetaMask Extension** - Install in your browser (Chrome/Firefox)
   - Create a wallet or import existing
   - Keep your seed phrase safe!

4. **Code Editor** (VS Code recommended)

### Optional
- **Polygon faucet access** for test MATIC

---

## Installation

### Step 1: Clone/Setup Project
```bash
# Navigate to project directory (already in C:\web3)
cd C:\web3

# Verify structure
dir /b
# Should show: CLAUDE.md HACKATHON_PLAN.md README.md RUN_GUIDE.md
# package.json, tailwind.config.js, postcss.config.js
# smart-contracts/ frontend/
```

### Step 2: Install Dependencies

The project uses a **monorepo-style structure** - we have separate `package.json` files:

```bash
# From project root, install everything
npm install                    # Installs devDependencies (hardhat, etc.)

# Install frontend dependencies
cd frontend
npm install
cd ..
```

**Expected output:**
- `node_modules/` created in root (for tools)
- `frontend/node_modules/` created (for React app)
- ~50-100 packages installed

---

## Local Development (Easiest for Testing)

This approach runs everything locally without needing testnet tokens.

### Step 1: Start Local Hardhat Node

Open **Terminal 1**:

```bash
# From project root
npm run node
```

**What you'll see:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545

Accounts
========

(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
Private Keys
============

(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Keep this terminal running!** This is your local blockchain.

### Step 2: Compile Smart Contracts

Open **Terminal 2** (in same project directory):

```bash
# Compile contracts
npm run compile
```

**Expected output:**
```
> smart-contracts@0.1.0 compile
> npx hardhat compile

Compiling 3 Solidity files
...
Compilation finished successfully
```

If you see errors:
```bash
# Clean and retry
cd smart-contracts
rm -rf cache artifacts
cd ..
npm run compile
```

### Step 3: Run Tests (Optional but Recommended)

```bash
npm run test
```

**Expected output:**
```
  Invoice
    ✓ Should set the correct name and symbol
    ✓ Should create an invoice and mint NFT
    ✓ Should reject zero buyer address
    ✓ Should prevent duplicate invoice hashes
    ✓ Should allow supplier to cancel tokenized invoice
  LendingPool
    ✓ Should deploy with correct contracts
    ✓ Should allow liquidity providers to deposit funds
    ✓ Should allow withdrawal of available liquidity
    ✓ Should allow supplier to borrow against tokenized invoice
    ✓ Should mark invoice as funded after borrowing

  10 passing
```

---

## Deploying Locally

### Deploy to Localhost (Your Hardhat Node)

```bash
# Make sure hardhat node is running in Terminal 1
# Then in Terminal 2:

npm run deploy --network localhost
# Or: npx hardhat run scripts/deploy.js --network localhost
```

**What happens:**
1. Deploys MockUSDC
2. Deploys Invoice contract
3. Deploys LendingPool (with contract addresses as constructor args)
4. Mints 10,000 test USDC to first 5 accounts
5. Saves addresses to `smart-contracts/deployments/localhost.json`

**Expected output:**
```
Deploying InvoiceFi contracts to network...

MockUSDC deployed to: 0x... (different each run)
Invoice deployed to: 0x...
LendingPool deployed to: 0x...

✅ Deployment complete!

Next steps:
1. Update frontend .env with contract addresses
2. Start frontend: npm run dev
3. Connect MetaMask to localhost
```

### Important: Copy Deployment Addresses

After deployment, check `smart-contracts/deployments/localhost.json`:

```bash
cat smart-contracts/deployments/localhost.json
```

Copy the addresses. You'll need them for the frontend.

---

## Running the Full Application

### Step 1: Configure Frontend Environment

Create `.env.local` in the `frontend` directory:

```bash
cd frontend

# Create .env.local file
# On Windows (PowerShell):
echo NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS=0xYOUR_INVOICE_ADDRESS > .env.local
echo NEXT_PUBLIC_LENDING_POOL_ADDRESS=0xYOUR_POOL_ADDRESS >> .env.local
echo NEXT_PUBLIC_STABLECOIN_ADDRESS=0xYOUR_MOCK_USDC_ADDRESS >> .env.local
```

Or manually create `frontend/.env.local`:
```env
NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0
```

*(Replace with your actual deployed addresses from localhost.json)*

### Step 2: Start Frontend Development Server

In **Terminal 2** (still in project root):

```bash
cd frontend
npm run dev
```

**Expected output:**
```
> invoicefi-frontend@0.1.0 dev
> next dev -- -p 3001

 ▲ Next.js 14.2.6
 - Local:        http://localhost:3001
 - Environments: local
 - Experiment(s) (use --实验 in .env):
 ✓ Ready in 123ms
```

### Step 3: Configure MetaMask for Localhost

1. Open MetaMask extension
2. Click network dropdown (usually says "Ethereum Mainnet")
3. Click "Add network" → "Add a network manually"
4. Fill in:
   - Network name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337` (or `1337` - check Hardhat output)
   - Currency symbol: `ETH`
5. Click "Save"

### Step 4: Import Hardhat Account to MetaMask

From the Hardhat node terminal output, copy one of the **Private Keys** (key #0 recommended).

In MetaMask:
1. Click account icon (top right)
2. "Import account"
3. Paste private key
4. Click "Import"

You now have 10,000 ETH in this account on localhost!

---

## Demo Flow: Test the Application

### 1. Open Frontend
Navigate to: **http://localhost:3001**

### 2. Explore Landing Page
- Click "Connect Wallet" → Select your imported account
- You should see your address truncated in header

### 3. Create an Invoice
- Click "Create Invoice" button
- Enter contract address (from localhost.json)
- Fill form:
  - **Buyer Address**: Copy another Hardhat account (key #1) address
  - **Amount**: `10000` (USDC)
  - **Due Date**: Tomorrow or next week
  - **Invoice Number**: `INV-001`
  - **Description**: `Test invoice`
- Click "Create Invoice & Tokenize"
- Approve MetaMask transaction (gas is free on localhost!)

✅ Invoice NFT created!

### 4. View Dashboard
- Click "Dashboard" in nav
- Enter contract addresses (or they may auto-fill)
- Click "Load Data"
- See your invoice listed with status "Tokenized"

### 5. Borrow Against Invoice
- On invoice card, click "Borrow Against This Invoice"
- Enter amount: `9000` (90%)
- Confirm transaction in MetaMask
- ✅ You'll receive ~9,000 USDC (minus 0.5% fee = 8,955 USDC)

### 6. View Loan
- Go to "My Loans" tab
- See active loan with 5% interest
- Status: Active

### 7. Simulate Buyer Payment
For demo, we'll use the Hardhat console as the "buyer" to repay:

Open **Terminal 3**:
```bash
# Get into Hardhat console
npx hardhat console --network localhost
```

In the console:
```javascript
// Load deployments
const fs = require('fs');
const deployments = JSON.parse(fs.readFileSync('./smart-contracts/deployments/localhost.json', 'utf8'));
const poolAddress = deployments.contracts.lendingPool;

// Get contract instances
const [deployer, supplier, buyer] = await hre.ethers.getSigners();
const LendingPool = await hre.ethers.getContractAt('LendingPool', poolAddress);

// Find the loan for tokenId 0
const loanId = 1; // First loan created

// Approve and repay (simulate buyer payment)
const loan = await LendingPool.loans(loanId);
const totalOwed = loan.principal + loan.interest;

// We'll call repay function (anyone can repay)
const tx = await LendingPool.repay(loanId);
await tx.wait();

console.log('✅ Loan repaid!');
```

### 8. Verify Repayment
- Refresh Dashboard → "My Loans" tab
- Loan status: "Repaid"
- Invoice status: "Paid"

🎉 **Full demo flow complete!**

---

## Deployment to Polygon Mumbai (Testnet)

If you want to deploy to real testnet (not localhost):

### Step 1: Get Test MATIC

1. Visit https://faucet.polygon.technology/
2. Enter your wallet address
3. Request test MATIC
4. Wait ~2 minutes

### Step 3: Configure .env File

```bash
cd smart-contracts
cp .env.example .env
```

Edit `.env`:
```env
POLYGON_MUMBAI_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FROM_METAMASK_EXPORT
POLYGONSCAN_API_KEY=your_api_key_from_polygonscan
```

⚠️ **WARNING**: Never commit `.env` to git! Add it to `.gitignore` (already done).

### Step 4: Deploy to Mumbai

```bash
cd ..
npm run deploy --network mumbai
```

This will:
- Deploy to Polygon Mumbai testnet
- Save addresses to `smart-contracts/deployments/mumbai.json`
- Mint 10,000 mock USDC to your account

### Step 5: Configure Frontend for Mumbai

Update `frontend/.env.local`:
```env
NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS=0x...from_mumbai_json
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x...from_mumbai_json
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x...from_mumbai_json
```

### Step 6: Switch MetaMask to Mumbai

1. Open MetaMask
2. Click network dropdown
3. Select "Polygon Mumbai" (or add it manually)
4. Import same private key if not already

### Step 7: Run Frontend

```bash
cd frontend
npm run dev
```

Now http://localhost:3001 connects to Mumbai testnet! You'll need real USDC on Mumbai - either deploy your own MockUSDC (as done in script) or get test USDC from a faucet.

---

## Common Commands Cheat Sheet

### Smart Contracts
```bash
# Compile
npm run compile

# Test
npm run test

# Start local blockchain
npm run node

# Deploy to localhost
npm run deploy --network localhost

# Deploy to Mumbai
npm run deploy --network mumbai

# Open Hardhat console
npx hardhat console --network localhost
```

### Frontend
```bash
cd frontend

# Development (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

### Utility
```bash
# Clean everything
cd smart-contracts && rm -rf cache artifacts coverage deployments/localhost
cd ../frontend && rm -rf .next

# Reset hardhat node (deletes chain state)
# Ctrl+C terminal running `npm run node`, then restart
```

---

## Project Structure Reference

```
C:\web3/
├── CLAUDE.md                    # Claude Code assistant guide
├── HACKATHON_PLAN.md           # Complete hackathon strategy
├── RUN_GUIDE.md                # This file
├── README.md                   # Main project README
│
├── .gitignore
├── package.json               # Root (Hardhat & dev tools)
├── tailwind.config.js
├── postcss.config.js
│
├── smart-contracts/          # Solidity contracts
│   ├── contracts/
│   │   ├── Invoice.sol
│   │   ├── LendingPool.sol
│   │   └── MockStablecoin.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   ├── Invoice.test.js
│   │   └── LendingPool.test.js
│   ├── deployments/
│   │   ├── localhost.json   # Created after deploy
│   │   └── mumbai.json      # Created after Mumbai deploy
│   ├── hardhat.config.js
│   ├── .env.example
│   └── package.json?        # If you want separate deps
│
└── frontend/                # Next.js app
    ├── .env.local          # Your contract addresses
    ├── .env.local.example
    ├── next.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    ├── tsconfig.json
    ├── pages/
    │   ├── _app.tsx
    │   ├── index.tsx        # Landing
    │   ├── dashboard.tsx    # Main dashboard
    │   ├── create-invoice.tsx
    │   └── lender.tsx
    ├── components/
    │   ├── WalletConnect.tsx
    │   └── Dashboard.tsx
    ├── utils/
    │   └── contracts.ts     # ABIs & helpers
    └── styles/
        └── globals.css
```

---

## Troubleshooting

### "MetaMask: There are no accounts yet"
**Solution**: Create/import an account in MetaMask. You need at least one account.

### "Hardhat node not responding on localhost:8545"
**Solution**:
1. Check if node is running in Terminal 1
2. If not: `npm run node`
3. If yes, MetaMask should connect to `http://127.0.0.1:8545`

### "Transaction rejected" or "User denied transaction signature"
**Solution**: You clicked "Reject" in MetaMask. Try again and click "Confirm".

### "Contract not deployed" or "Invalid contract address"
**Solution**:
1. Run `npm run deploy` to deploy contracts
2. Copy addresses from `smart-contracts/deployments/localhost.json`
3. Paste into frontend contract address inputs

### "Insufficient funds for gas * price + value"
**Solution**: On localhost, you should have 10,000 ETH from Hardhat. If you imported a different account, make sure it's one of the Hardhat accounts (check terminal output for private keys).

On Mumbai: get more test MATIC from faucet.

### "Cannot find module 'ethers'"
**Solution**:
```bash
# In frontend directory
cd frontend
npm install ethers
```

### "Module not found: Can't resolve 'fs'"
**Solution**: This usually happens if you try to use Node.js modules (fs, path) in frontend pages. Only use them in `utils/contracts.ts` or `getStaticProps`/`getServerSideProps`. If error persists, check your imports.

### Port 3000 already in use
**Solution**:
```bash
# Frontend runs on port 3001 by default (see package.json)
# If you want to change it, edit frontend/package.json scripts:
# "dev": "next dev -p 3001"  ← change 3001 to something else
```

### Contracts compile but tests fail with "invalid opcode"
**Solution**: Clean and recompile:
```bash
cd smart-contracts
rm -rf cache artifacts
cd ..
npm run compile
npm run test
```

### "Error: call revert exception"
**Solution**: Check that you're calling functions with correct parameters and from the correct account (e.g., only supplier can create invoice). See test files for correct usage patterns.

### IPFS/CID not working
**Solution**: MVP uses simplified hash generation. For production IPFS, add Pinata API keys to `.env.local` and modify `create-invoice.tsx` to upload file.

---

## Getting Help

1. **Check this guide** - Most answers here
2. **Read HACKATHON_PLAN.md** - For architecture and strategy
3. **Read README.md** - For project overview
4. **Inspect test files** - See examples of correct contract usage
5. **Check browser console** - Frontend errors appear here
6. **Check terminal** - Server logs show detailed errors

---

## Next Steps After Successful Demo

1. Add IPFS integration (Pinata)
2. Implement Chainlink oracle for payment verification
3. Add invoice risk scoring
4. Deploy to Polygon mainnet
5. Add proper KYC/KYB with theGraph or similar
6. Build admin dashboard
7. Add multi-signature wallet for protocol treasury
8. Implement DAO governance

---

**🎉 You're ready to build, deploy, and demo InvoiceFi!**

If this is for a hackathon, good luck! Focus on a smooth demo experience over perfect code.