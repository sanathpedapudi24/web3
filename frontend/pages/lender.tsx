import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LendingPoolABI, StablecoinABI, CONTRACT_ADDRESSES, formatCurrency } from '../utils/contracts';

export default function LenderPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [poolAddress, setPoolAddress] = useState('');
  const [poolStats, setPoolStats] = useState<any>(null);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    };
    init();
  }, []);

  const fetchPoolData = async () => {
    if (!poolAddress) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const poolContract = new ethers.Contract(poolAddress, LendingPoolABI, provider);

    try {
      const stats = await poolContract.getPoolStats();
      setPoolStats({
        totalLiquidity: stats.totalLiquidity,
        totalBorrowed: stats.totalBorrowed,
        availableLiquidity: stats.availableLiquidity,
        activeLoanCount: Number(stats.activeLoanCount),
      });
    } catch (error) {
      console.error('Error fetching pool stats:', error);
    }
  };

  const handleDeposit = async () => {
    const amount = prompt('Enter amount of USDC to deposit:');
    if (!amount) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Correct addresses from CONTRACT_ADDRESSES
      const poolAddress = CONTRACT_ADDRESSES.localhost.lendingPool;
      const stablecoinAddress = CONTRACT_ADDRESSES.localhost.stablecoin;

      // Create contracts
      const poolContract = new ethers.Contract(poolAddress, LendingPoolABI, signer);
      const stablecoin = new ethers.Contract(stablecoinAddress, StablecoinABI, signer);

      // Convert amount (6 decimals)
      const amountInWei = ethers.parseUnits(amount.toString(), 6);

      console.log('Approving', amount, 'USDC to pool...');
      // STEP 1: Approve
      const approveTx = await stablecoin.approve(poolAddress, amountInWei);
      await approveTx.wait();
      console.log('Approval successful');

      // STEP 2: Deposit
      console.log('Depositing to pool...');
      const tx = await poolContract.deposit(amountInWei);
      await tx.wait();
      console.log('Deposit successful');

      alert('Deposit successful!');
      fetchPoolData();
    } catch (error: any) {
      console.error('Deposit error:', error);
      alert('Deposit failed: ' + (error.message || error.toString()));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">InvoiceFi</div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-600 hover:text-primary-600 font-medium">
              Dashboard
            </a>
            <a href="/create-invoice" className="text-gray-600 hover:text-primary-600 font-medium">
              Create Invoice
            </a>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Lender Portal</h1>
        <p className="text-gray-600 mb-8">Provide liquidity and earn yield from invoice financing</p>

        {/* Pool Stats */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Pool Configuration</h2>
          <div className="mb-4">
            <label className="label">Lending Pool Contract Address</label>
            <input
              type="text"
              className="input-field"
              placeholder="0x..."
              value={poolAddress}
              onChange={(e) => setPoolAddress(e.target.value)}
            />
          </div>
          <button
            onClick={fetchPoolData}
            className="btn-primary"
          >
            Load Pool Stats
          </button>
        </div>

        {poolStats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="text-gray-600 text-sm">Total Liquidity</div>
              <div className="text-3xl font-bold text-green-600">${formatCurrency(poolStats.totalLiquidity, 6)}</div>
            </div>
            <div className="card">
              <div className="text-gray-600 text-sm">Total Borrowed</div>
              <div className="text-3xl font-bold text-blue-600">${formatCurrency(poolStats.totalBorrowed, 6)}</div>
            </div>
            <div className="card">
              <div className="text-gray-600 text-sm">Available</div>
              <div className="text-3xl font-bold text-primary-600">${formatCurrency(poolStats.availableLiquidity, 6)}</div>
            </div>
            <div className="card">
              <div className="text-gray-600 text-sm">Active Loans</div>
              <div className="text-3xl font-bold text-purple-600">{poolStats.activeLoanCount}</div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Deposit Section */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Deposit Funds</h2>
            <p className="text-gray-600 mb-4">
              Add stablecoins to the lending pool to earn interest. The pool automatically allocates
              funds to borrowers.
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Expected Returns</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Interest rate: 5% per loan term (30 days)</li>
                  <li>• Auto-compounding available</li>
                  <li>• Lower risk: Short-term, invoice-backed</li>
                </ul>
              </div>
              <button
                onClick={handleDeposit}
                className="btn-primary w-full"
              >
                Deposit USDC
              </button>
            </div>
          </div>

          {/* Stats & Info */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">How Lending Works</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <h4 className="font-semibold">Deposit Funds</h4>
                  <p className="text-sm text-gray-600">Add USDC to the lending pool</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <h4 className="font-semibold">Fund Invoices</h4>
                  <p className="text-sm text-gray-600">When suppliers borrow, your funds are automatically allocated</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <h4 className="font-semibold">Earn Interest</h4>
                  <p className="text-sm text-gray-600">When buyers repay, you receive principal + 5% interest</p>
                </div>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Risk Mitigation</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ Invoice NFTs represent real receivables</li>
                <li>✅ Short loan terms (30 days max)</li>
                <li>✅ Buyer payment auto-repays loan</li>
                <li>✅ Transparent on-chain tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="card mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
          <p className="text-gray-600 italic">
            In production, this would show all tokenized invoices available for funding,
            with risk scores and expected APY.
          </p>
          <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg">
            <p className="text-sm text-gray-500">
              For MVP demo: Use the simulateBuyerPayment function to repay loans
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}