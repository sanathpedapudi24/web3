# InvoiceFi - DeFi for B2B Supply Chain Finance

A Web3-powered decentralized supply chain finance protocol where suppliers can tokenize unpaid invoices as on-chain assets and instantly access liquidity from a decentralized lending pool.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ with npm
- **MetaMask** browser extension
- **Git**

### Project Structure
```
invoicefi/
├── smart-contracts/          # Solidity contracts
│   ├── contracts/
│   │   ├── Invoice.sol      # ERC-721 NFT for invoices
│   │   ├── LendingPool.sol  # Decentralized lending pool
│   │   └── MockStablecoin.sol # Test USDC token
│   ├── scripts/
│   │   └── deploy.js        # Deployment script
│   ├── test/
│   │   ├── Invoice.test.js
│   │   └── LendingPool.test.js
│   └── hardhat.config.js
├── frontend/                # Next.js React application
│   ├── pages/
│   │   ├── index.tsx        # Landing page
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── create-invoice.tsx
│   │   └── lender.tsx
│   ├── components/
│   │   ├── WalletConnect.tsx
│   │   └── Dashboard.tsx
│   └── utils/
│       └── contracts.ts     # ABIs and helpers
├── package.json             # Root package manager (monorepo style)
├── tailwind.config.js
└── postcss.config.js
```

## 📦 Installation

1. **Clone and setup**
```bash
cd invoicefi
# Install all dependencies
npm install
cd frontend && npm install && cd ..
```

## 🏗️ Build & Compile

### Smart Contracts
```bash
# Compile all contracts
npm run compile

# Run tests
npm run test

# Start local Hardhat node (for development)
npm run node
```

### Frontend
```bash
# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🚀 Deployment

### Deploy to Polygon Mumbai Testnet

1. **Get Test MATIC**
   - Visit https://faucet.polygon.technology/
   - Request test MATIC to your MetaMask wallet

2. **Configure Environment**
   ```bash
   # Create .env file in smart-contracts directory
   cp smart-contracts/.env.example smart-contracts/.env
   ```

   Edit `smart-contracts/.env`:
   ```env
   POLYGON_MUMBAI_URL=https://rpc-mumbai.maticvigil.com
   PRIVATE_KEY=your_wallet_private_key_here
   POLYGONSCAN_API_KEY=your_polygonscan_api_key
   ```

3. **Deploy**
```bash
npm run deploy
```

This will deploy:
- MockUSDC (test stablecoin)
- Invoice contract
- LendingPool contract

Deployed addresses will be saved to `smart-contracts/deployments/mumbai.json`.

4. **Verify on Polygonscan** (optional)
```bash
npx hardhat verify --network mumbai <contract_address> <constructor_args>
```

## 💻 Usage

### For Suppliers (Create Invoice)

1. Connect your MetaMask wallet
2. Navigate to `/create-invoice`
3. Fill in invoice details:
   - Buyer address
   - Invoice amount
   - Due date
   - Invoice number & description
4. Click "Create Invoice & Tokenize"
5. Invoice is minted as NFT in your wallet

6. Borrow against invoice:
   - Go to Dashboard
   - Select your tokenized invoice
   - Click "Borrow Against This Invoice"
   - Enter borrow amount (up to 90% of invoice value)
   - Confirm transaction
   - Receive USDC instantly!

### For Lenders (Provide Liquidity)

1. Navigate to `/lender` or Lender tab in Dashboard
2. Enter Lending Pool contract address
3. Click "Deposit Funds"
4. Approve and deposit USDC
5. Earn 5% interest when loans are repaid

### Demo Flow

For quick demonstration without deploying:

1. Deploy contracts to Mumbai testnet using `npm run deploy`
2. Start frontend: `npm run dev`
3. Open http://localhost:3000
4. Go to Dashboard → Enter contract addresses from deployment
5. Click "Load Data"
6. Create invoice at `/create-invoice`
7. Borrow against it
8. Use admin function `simulateBuyerPayment` in Hardhat console to simulate buyer payment:
```bash
npx hardhat console --network localhost
# In console:
const pool = await ethers.getContractAt("LendingPool", "0x...");
await pool.simulateBuyerPayment(tokenId);
```

## 🧪 Testing

### Smart Contracts
```bash
# Run all tests
npm run test

# Run specific test
npx hardhat test test/Invoice.test.js
```

### Frontend Testing
Manual testing in browser with MetaMask:
1. Connect wallet
2. Create invoice
3. Borrow
4. Check dashboard updates

## 🔧 Configuration

### Environment Variables

**Smart Contracts** (`smart-contracts/.env`):
```env
POLYGON_MUMBAI_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=0x...
POLYGONSCAN_API_KEY=your_api_key
```

**Frontend** (`.env.local` in frontend directory):
```env
NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x...
NEXT_PUBLIC_STABLECOIN_ADDRESS=0x...
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_key  # Optional for IPFS
NEXT_PUBLIC_PINATA_SECRET_KEY=your_pinata_secret  # Optional
```

## 📝 Key Features

### MVP Features
- ✅ Invoice NFT creation (ERC-721)
- ✅ Decentralized lending pool
- ✅ Borrow against invoices (up to 90% value)
- ✅ Auto-repayment upon buyer payment
- ✅ Wallet connection (MetaMask)
- ✅ Dashboard for suppliers & lenders
- ✅ Mock stablecoin for testing

### Future Enhancements
- Real IPFS integration with Pinata
- Chainlink oracle for off-chain payment verification
- Invoice risk scoring algorithm
- Secondary market for invoice NFTs
- DAO governance
- Multi-chain support

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Polygon (Mumbai Testnet) |
| Smart Contracts | Solidity 0.8.19 |
| Framework | Hardhat |
| Testing | Chai, Mocha, Hardhat Network |
| Frontend | Next.js 14 |
| Styling | Tailwind CSS |
| Web3 Library | Ethers.js v6 |
| Wallet | MetaMask |
| Storage | IPFS (optional, via Pinata) |
| Contracts | OpenZeppelin |

## 📚 Contract Overview

### Invoice.sol
- ERC-721 NFT representing an unpaid invoice
- Stores buyer, supplier, amount, due date
- Metadata stored on IPFS (or hash for MVP)
- Status lifecycle: TOKENIZED → FUNDED → PAID / CANCELLED

### LendingPool.sol
- Accepts USDC deposits from lenders
- Allows borrowing against approved invoices
- 5% fixed interest rate, 30-day term
- Admin can simulate buyer payments (demo)
- Reentrancy protection

### MockStablecoin.sol
- Test USDC token for development
- Mintable by owner for testing purposes

## 🎯 Hackathon Checklist

- [x] Smart contracts deployed on testnet
- [x] Tests passing
- [x] Frontend connected to contracts
- [x] Working demo flow: create → borrow → repay
- [x] Responsive UI
- [x] Clean README
- [x] Pitch deck created

## 📖 Documentation

See [HACKATHON_PLAN.md](./HACKATHON_PLAN.md) for:
- Market research & analysis
- Detailed execution roadmap
- MVP specifications
- Unique selling propositions
- Multiple tech stack options
- Complete pitch deck content
- Tips for hackathon beginners

## 🤝 Contributing

This is a hackathon project. For production use:
1. Audit smart contracts by professionals
2. Implement proper KYC/KYB verification
3. Add Chainlink oracles for real payment confirmation
4. Deploy on mainnet
5. Form legal entity and obtain necessary licenses

## 📄 License

MIT

---

**Built with ❤️ for hackathon glory**