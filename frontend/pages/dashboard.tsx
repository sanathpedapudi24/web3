import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {InvoiceABI,  LendingPoolABI, formatCurrency, isContractDeployed, getTokenDecimals } from '../utils/contracts';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import WalletConnect from '../components/WalletConnect';

export default function Dashboard() {
  const [account, setAccount] = useState<string | null>(null);
  const [contractAddresses, setContractAddresses] = useState({
    invoice: process.env.NEXT_PUBLIC_INVOICE_CONTRACT_ADDRESS || '',
    lendingPool: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '',
    stablecoin: process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS || '',
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [poolStats, setPoolStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'loans' | 'lender'>('invoices');
  const [userBalance, setUserBalance] = useState<string>('0');
  const [stablecoinDecimals, setStablecoinDecimals] = useState<number>(6);
  const [showBlockchainWarning, setShowBlockchainWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getInvoiceStatus = (status: number) => {
    const labels = ['Draft', 'Tokenized', 'Funded', 'Paid', 'Cancelled'];
    const classes = [
      'bg-gray-100 text-gray-700',
      'bg-blue-50 text-blue-700',
      'bg-indigo-50 text-indigo-700',
      'bg-emerald-50 text-emerald-700',
      'bg-rose-50 text-rose-700',
    ];

    return {
      label: labels[status] || 'Unknown',
      className: classes[status] || 'bg-gray-100 text-gray-700',
    };
  };

  // Validate and load balances on wallet connect
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await validateAndLoadBalance(provider, accounts[0]);
        }
      }
    };
    init();
  }, [contractAddresses]);

  // Validate contracts are deployed and fetch balance with dynamic decimals
  const validateAndLoadBalance = async (provider: any, address: string) => {
    try {
      const invoiceAddr = contractAddresses.invoice?.trim();
      const poolAddr = contractAddresses.lendingPool?.trim();
      const stablecoinAddr = contractAddresses.stablecoin?.trim();

      if (!invoiceAddr || !poolAddr || !stablecoinAddr) {
        setShowBlockchainWarning(false);
        return;
      }

      const [invoiceDeployed, poolDeployed, stablecoinDeployed] = await Promise.all([
        isContractDeployed(invoiceAddr, provider),
        isContractDeployed(poolAddr, provider),
        isContractDeployed(stablecoinAddr, provider),
      ]);

      if (!invoiceDeployed || !poolDeployed || !stablecoinDeployed) {
        setShowBlockchainWarning(true);
        setUserBalance('0');
        return;
      }

      setShowBlockchainWarning(false);

      // Fetch dynamic decimals and balance
      const decimals = await getTokenDecimals(stablecoinAddr, provider);
      setStablecoinDecimals(decimals);
      await checkBalance(provider, address, decimals);
    } catch (error) {
      console.error('Error validating contracts:', error);
      setShowBlockchainWarning(true);
    }
  };

  // Check balance with dynamic decimals
  const checkBalance = async (provider: any, address: string, decimals: number = stablecoinDecimals) => {
    if (!contractAddresses.stablecoin) return;
    try {
      const stablecoin = new ethers.Contract(contractAddresses.stablecoin, [
        'function balanceOf(address) view returns (uint256)'
      ], provider);
      const balance = await stablecoin.balanceOf(address);
      setUserBalance(formatCurrency(balance, decimals));
    } catch (error) {
      console.error('Error checking balance:', error);
      setUserBalance('0');
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
        await validateAndLoadBalance(provider, account);
        alert('Contracts refreshed! Re-import the mUSDC token in MetaMask if needed.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fetchData = async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask is not detected. Please install or enable MetaMask first.');
      return;
    }

    if (!account) {
      alert('Please connect your wallet before loading dashboard data.');
      return;
    }

    const invoiceAddress = contractAddresses.invoice.trim();
    const lendingPoolAddress = contractAddresses.lendingPool.trim();
    const stablecoinAddress = contractAddresses.stablecoin.trim();

    if (!invoiceAddress || !lendingPoolAddress || !stablecoinAddress) {
      alert('Please enter Invoice, Lending Pool, and Stablecoin contract addresses.');
      return;
    }

    if (!ethers.isAddress(invoiceAddress) || !ethers.isAddress(lendingPoolAddress) || !ethers.isAddress(stablecoinAddress)) {
      alert('One or more contract addresses are invalid. Please check and try again.');
      return;
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum);

    try {
      setIsLoading(true);
      const [invoiceCode, poolCode, stablecoinCode] = await Promise.all([
        provider.getCode(invoiceAddress),
        provider.getCode(lendingPoolAddress),
        provider.getCode(stablecoinAddress),
      ]);

      if (invoiceCode === '0x' || poolCode === '0x' || stablecoinCode === '0x') {
        alert('At least one address is not a deployed contract on the current network. Re-deploy or update addresses, then try again.');
        setShowBlockchainWarning(true);
        return;
      }

      // Fetch invoices
      console.log("Invoice Address:", invoiceAddress);
      const invoiceContract = new ethers.Contract(invoiceAddress, InvoiceABI, provider);
      const allInvoices = [];
      for (let i = 0; i < 20; i++) {
        try {
          const data = await invoiceContract.getInvoice(i);
          allInvoices.push({
            id: i,
            supplier: data.supplier,
            buyer: data.buyer,
            amount: Number(data.amount),
            dueDate: Number(data.dueDate),
            status: Number(data.status),
          });
        } catch (e) {
          break;
        }
      }
      setInvoices(allInvoices);

      // Fetch user's loans
      const poolContract = new ethers.Contract(lendingPoolAddress, LendingPoolABI, provider);
      const userLoanIds = await poolContract.getBorrowerLoans(account);
      const userLoans = [];
      for (const loanId of userLoanIds) {
        const loan = await poolContract.loans(loanId);
        userLoans.push({
          id: Number(loanId),
          tokenId: Number(loan.tokenId),
          principal: Number(loan.principal),
          interest: Number(loan.interest),
          startTime: Number(loan.startTime),
          repayBy: Number(loan.repayBy),
          repaid: loan.repaid,
        });
      }
      setLoans(userLoans);

      // Fetch pool stats
      const stats = await poolContract.getPoolStats();
      setPoolStats({
        totalLiquidity: stats.totalLiquidity,
        totalBorrowed: stats.totalBorrowed,
        availableLiquidity: stats.availableLiquidity,
        activeLoanCount: Number(stats.activeLoanCount),
      });

      // Fetch balance with dynamic decimals
      const decimals = await getTokenDecimals(stablecoinAddress, provider);
      setStablecoinDecimals(decimals);
      await checkBalance(provider, account, decimals);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching data: ' + (error.message || error));
    } finally {
      setIsLoading(false);
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

    if (!contractAddresses.stablecoin || !contractAddresses.lendingPool) {
      alert('Please enter Stablecoin and Lending Pool contract addresses first.');
      return;
    }

    const amount = prompt('Enter deposit amount in USDC:');
    if (!amount) return;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert('Please enter a valid deposit amount greater than 0.');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const stablecoin = new ethers.Contract(contractAddresses.stablecoin, [
        'function approve(address, uint256) returns (bool)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)'
      ], signer);

      // Dynamically fetch decimals
      const decimals = await stablecoin.decimals();
      const amountWei = ethers.parseUnits(amount, Number(decimals));

      // Check balance before attempting transfer
      const userBalance = await stablecoin.balanceOf(account);
      const userBalanceFormatted = formatCurrency(userBalance, Number(decimals));
      if (userBalance < amountWei) {
        alert(`Insufficient mUSDC balance. You have ${userBalanceFormatted} USDC but are trying to deposit ${amount} USDC.\n\nIf you restarted the blockchain, re-import the token in MetaMask and click Refresh Contracts.`);
        return;
      }

      const poolContract = new ethers.Contract(contractAddresses.lendingPool, LendingPoolABI, signer);

      // Approve first
      const approveTx = await stablecoin.approve(contractAddresses.lendingPool, amountWei);
      await approveTx.wait();

      // Deposit
      const depositTx = await poolContract.deposit(amountWei);
      await depositTx.wait();

      alert('Deposit successful!');
      fetchData();
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Deposit failed: ' + (error.message || error));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        account={account}
        balanceLabel={`Balance: $${userBalance}`}
        rightContent={<WalletConnect onConnect={(address) => setAccount(address || null)} />}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        {!account && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Connect your wallet to load invoices, loans, and deposit actions.
          </div>
        )}

        {showBlockchainWarning && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Blockchain restarted or contracts redeployed.</strong> One or more contract addresses are not deployed on the current network. Please:
            <ol className="mt-2 ml-4 list-inside list-decimal space-y-1">
              <li>Update contract addresses in the form below with addresses from <code className="bg-red-100 px-1">deployments/localhost.json</code></li>
              <li>Re-import the mUSDC token in MetaMask (Token contract address from .env.local)</li>
              <li>Click "Refresh Contracts" button to validate and reload balances</li>
            </ol>
          </div>
        )}

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure contracts, monitor invoices, and manage lending activity.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contract Configuration</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Invoice Contract</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="0x..."
                value={contractAddresses.invoice}
                onChange={(e) => setContractAddresses({...contractAddresses, invoice: e.target.value})}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Lending Pool Contract</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="0x..."
                value={contractAddresses.lendingPool}
                onChange={(e) => setContractAddresses({...contractAddresses, lendingPool: e.target.value})}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Stablecoin Contract</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="0x..."
                value={contractAddresses.stablecoin}
                onChange={(e) => setContractAddresses({...contractAddresses, stablecoin: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load Data'}
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

        {/* Pool Stats */}
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

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 ${activeTab === 'invoices' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices ({invoices.length})
          </button>
          <button
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 ${activeTab === 'loans' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('loans')}
          >
            My Loans ({loans.length})
          </button>
          <button
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-all duration-200 ${activeTab === 'lender' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('lender')}
          >
            Lender View
          </button>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:scale-[1.02]">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Invoice #{invoice.id}</h3>
                    <p className="text-sm text-gray-600">
                      Buyer: {invoice.buyer.slice(0, 10)}...
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getInvoiceStatus(invoice.status).className}`}>
                    {getInvoiceStatus(invoice.status).label}
                  </span>
                </div>
                <div className="mb-4 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <div className="font-semibold">${formatCurrency(invoice.amount, 6)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <div className="font-semibold">{new Date(invoice.dueDate * 1000).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <div className="font-mono text-xs">{invoice.supplier.slice(0, 10)}...</div>
                  </div>
                </div>
                {invoice.status === 1 && account === invoice.supplier && (
                  <button
                    onClick={() => {
                      const borrowAmount = prompt('Enter borrow amount (max 90% of invoice):', (invoice.amount * 0.9).toString());
                      if (borrowAmount && contractAddresses.lendingPool) {
                        alert('Borrow functionality implemented separately');
                      }
                    }}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700"
                  >
                    Borrow Against This Invoice
                  </button>
                )}
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                <p className="text-gray-600">No invoices found. Deploy and enter contract addresses above.</p>
              </div>
            )}
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {loans.length > 0 ? (
              loans.map((loan) => (
                <div key={loan.id} className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:scale-[1.02]">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Loan #{loan.id}</h3>
                      <p className="text-sm text-gray-600">Invoice Token ID: {loan.tokenId}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${loan.repaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {loan.repaid ? 'Repaid' : 'Active'}
                    </span>
                  </div>
                  <div className="grid gap-4 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-gray-600">Principal:</span>
                      <div className="font-semibold">${formatCurrency(loan.principal, 6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Interest:</span>
                      <div className="font-semibold">${formatCurrency(loan.interest, 6)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Repay By:</span>
                      <div className="font-semibold">{new Date(loan.repayBy * 1000).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Due:</span>
                      <div className="font-semibold">${formatCurrency(BigInt(loan.principal) + BigInt(loan.interest), 6)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                <p className="text-gray-600">No loans found. Borrow against an invoice to see your loans here.</p>
              </div>
            )}
          </div>
        )}

        {/* Lender View Tab */}
        {activeTab === 'lender' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Provide Liquidity</h3>
            <p className="mb-6 text-sm text-gray-600">
              Deposit stablecoins into the lending pool to earn 5% interest when suppliers borrow against invoices.
            </p>
            <button
              onClick={handleDeposit}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700"
            >
              Deposit Funds
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
