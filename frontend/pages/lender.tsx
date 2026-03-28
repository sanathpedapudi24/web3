import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LendingPoolABI, StablecoinABI, formatCurrency, isContractDeployed, getTokenDecimals } from '../utils/contracts';
import Navbar from '../components/Navbar';
import WalletConnect from '../components/WalletConnect';

export default function LenderPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [poolAddress, setPoolAddress] = useState(process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '');
  const [stablecoinAddress, setStablecoinAddress] = useState(process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS || '');
  const [poolStats, setPoolStats] = useState<any>(null);
  const [stablecoinDecimals, setStablecoinDecimals] = useState<number>(6);
  const [showBlockchainWarning, setShowBlockchainWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await validateAndLoadPoolData(provider);
        }
      }
    };
    init();
  }, [poolAddress, stablecoinAddress]);

  // Validate contracts are deployed
  const validateAndLoadPoolData = async (provider: any) => {
    try {
      const poolAddr = poolAddress?.trim();
      const stablecoinAddr = stablecoinAddress?.trim();

      if (!poolAddr || !stablecoinAddr) {
        setShowBlockchainWarning(false);
        return;
      }

      const [poolDeployed, stablecoinDeployed] = await Promise.all([
        isContractDeployed(poolAddr, provider),
        isContractDeployed(stablecoinAddr, provider),
      ]);

      if (!poolDeployed || !stablecoinDeployed) {
        setShowBlockchainWarning(true);
        setPoolStats(null);
        return;
      }

      setShowBlockchainWarning(false);

      // Fetch dynamic decimals
      const decimals = await getTokenDecimals(stablecoinAddr, provider);
      setStablecoinDecimals(decimals);

      // Fetch pool stats
      await fetchPoolData();
    } catch (error) {
      console.error('Error validating contracts:', error);
      setShowBlockchainWarning(true);
    }
  };

  const fetchPoolData = async () => {
    const poolAddressValue = poolAddress.trim();
    if (!poolAddressValue) {
      alert('Please enter the Lending Pool contract address.');
      return;
    }

    if (!ethers.isAddress(poolAddressValue)) {
      alert('Lending Pool address is invalid.');
      return;
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const code = await provider.getCode(poolAddressValue);
    if (code === '0x') {
      alert('No contract found at this Lending Pool address on the current network.');
      setShowBlockchainWarning(true);
      return;
    }

    const poolContract = new ethers.Contract(poolAddressValue, LendingPoolABI, provider);

    try {
      setIsLoading(true);
      const stats = await poolContract.getPoolStats();
      setPoolStats({
        totalLiquidity: stats.totalLiquidity,
        totalBorrowed: stats.totalBorrowed,
        availableLiquidity: stats.availableLiquidity,
        activeLoanCount: Number(stats.activeLoanCount),
      });
    } catch (error) {
      console.error('Error fetching pool stats:', error);
      alert('Error fetching pool stats: ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh contracts and revalidate
  const refreshContracts = async () => {
    if (!account) {
      alert('Please connect wallet first.');
      return;
    }
    if (typeof window !== 'undefined' && window.ethereum) {
      setIsLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setShowBlockchainWarning(false);
        await validateAndLoadPoolData(provider);
        alert('Contracts refreshed! Re-import the mUSDC token in MetaMask if needed.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeposit = async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask is not detected. Please install or enable MetaMask first.');
      return;
    }

    if (!account) {
      alert('Please connect your wallet before depositing funds.');
      return;
    }

    const amount = prompt('Enter amount of USDC to deposit:');
    if (!amount) return;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('Please enter a valid deposit amount greater than 0.');
      return;
    }

    const poolAddressValue = poolAddress.trim();
    const stablecoinAddressValue = stablecoinAddress.trim();

    if (!poolAddressValue || !stablecoinAddressValue) {
      alert('Please enter both Lending Pool and Stablecoin contract addresses.');
      return;
    }

    if (!ethers.isAddress(poolAddressValue) || !ethers.isAddress(stablecoinAddressValue)) {
      alert('One or more contract addresses are invalid.');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const [poolCode, stablecoinCode] = await Promise.all([
        provider.getCode(poolAddressValue),
        provider.getCode(stablecoinAddressValue),
      ]);

      if (poolCode === '0x' || stablecoinCode === '0x') {
        alert('At least one address is not a deployed contract on the current network.');
        setShowBlockchainWarning(true);
        return;
      }

      // Create contracts
      const poolContract = new ethers.Contract(poolAddressValue, LendingPoolABI, signer);
      const stablecoin = new ethers.Contract(stablecoinAddressValue, StablecoinABI, signer);

      // Convert amount with dynamic decimals
      const amountInWei = ethers.parseUnits(amount.toString(), stablecoinDecimals);

      // Check balance before attempting transfer
      const userBalance = await stablecoin.balanceOf(account);
      const userBalanceFormatted = formatCurrency(userBalance, stablecoinDecimals);
      if (userBalance < amountInWei) {
        alert(`Insufficient mUSDC balance. You have ${userBalanceFormatted} USDC but are trying to deposit ${amount} USDC.\n\nIf you restarted the blockchain, re-import the token in MetaMask and click Refresh Contracts.`);
        return;
      }

      console.log('Approving', amount, 'USDC to pool...');
      // STEP 1: Approve
      const approveTx = await stablecoin.approve(poolAddressValue, amountInWei);
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
      <Navbar
        account={account}
        rightContent={<WalletConnect onConnect={(address) => setAccount(address || null)} />}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        {!account && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Connect your wallet to load pool stats and deposit liquidity.
          </div>
        )}

        {showBlockchainWarning && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Blockchain restarted or contracts redeployed.</strong> One or more contract addresses are not deployed on the current network. Please:
            <ol className="mt-2 ml-4 list-inside list-decimal space-y-1">
              <li>Update contract addresses in the form below with addresses from <code className="bg-red-100 px-1">deployments/localhost.json</code></li>
              <li>Re-import the mUSDC token in MetaMask</li>
              <li>Click "Refresh Contracts" button to validate and reload stats</li>
            </ol>
          </div>
        )}

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Lender Portal</h1>
          <p className="mt-1 text-sm text-gray-600">Provide liquidity and earn yield from invoice financing.</p>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Pool Configuration</h2>
          <div className="mb-4 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Lending Pool Contract Address</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="0x..."
                value={poolAddress}
                onChange={(e) => setPoolAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Stablecoin Contract Address</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="0x..."
                value={stablecoinAddress}
                onChange={(e) => setStablecoinAddress(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPoolData}
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load Pool Stats'}
            </button>
            <button
              onClick={refreshContracts}
              disabled={isLoading}
              className="rounded-md border border-indigo-600 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition-all duration-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Contracts'}
            </button>
          </div>
        </div>

        {poolStats && (
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:scale-[1.02]">
              <div className="text-gray-600 text-sm">Total Liquidity</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">${formatCurrency(poolStats.totalLiquidity, 6)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:scale-[1.02]">
              <div className="text-gray-600 text-sm">Total Borrowed</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">${formatCurrency(poolStats.totalBorrowed, 6)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:scale-[1.02]">
              <div className="text-gray-600 text-sm">Available</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">${formatCurrency(poolStats.availableLiquidity, 6)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:scale-[1.02]">
              <div className="text-gray-600 text-sm">Active Loans</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{poolStats.activeLoanCount}</div>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold mb-4">Deposit Funds</h2>
            <p className="text-gray-600 mb-4">
              Add stablecoins to the lending pool to earn interest. The pool automatically allocates
              funds to borrowers.
            </p>
            <div className="space-y-4">
              <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Expected Returns</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Interest rate: 5% per loan term (30 days)</li>
                  <li>• Auto-compounding available</li>
                  <li>• Lower risk: Short-term, invoice-backed</li>
                </ul>
              </div>
              <button
                onClick={handleDeposit}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700"
              >
                Deposit USDC
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold mb-4">How Lending Works</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">1</span>
                <div>
                  <h4 className="font-semibold">Deposit Funds</h4>
                  <p className="text-sm text-gray-600">Add USDC to the lending pool</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">2</span>
                <div>
                  <h4 className="font-semibold">Fund Invoices</h4>
                  <p className="text-sm text-gray-600">When suppliers borrow, your funds are automatically allocated</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">3</span>
                <div>
                  <h4 className="font-semibold">Earn Interest</h4>
                  <p className="text-sm text-gray-600">When buyers repay, you receive principal + 5% interest</p>
                </div>
              </li>
            </ul>

            <div className="mt-6 rounded-md border border-emerald-100 bg-emerald-50 p-4">
              <h4 className="mb-2 font-semibold text-emerald-900">Risk Mitigation</h4>
              <ul className="space-y-1 text-sm text-emerald-800">
                <li>Invoice NFTs represent real receivables</li>
                <li>Short loan terms (30 days max)</li>
                <li>Buyer payment auto-repays loan</li>
                <li>Transparent on-chain tracking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
          <p className="text-gray-600 italic">
            In production, this would show all tokenized invoices available for funding,
            with risk scores and expected APY.
          </p>
          <div className="mt-4 rounded-md border border-dashed border-gray-300 p-4">
            <p className="text-sm text-gray-500">
              For MVP demo: Use the simulateBuyerPayment function to repay loans
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
