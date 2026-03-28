import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {InvoiceABI,  LendingPoolABI, formatCurrency } from '../utils/contracts';

export default function Dashboard() {
  const [account, setAccount] = useState<string | null>(null);
  const [contractAddresses, setContractAddresses] = useState({
    invoice: '',
    lendingPool: '',
    stablecoin: '',
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [poolStats, setPoolStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'loans' | 'lender'>('invoices');
  const [userBalance, setUserBalance] = useState<string>('0');

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await checkBalance(provider, accounts[0]);
        }
      }
    };
    init();
  }, []);

  const checkBalance = async (provider: any, address: string) => {
    if (!contractAddresses.stablecoin) return;
    const stablecoin = new ethers.Contract(contractAddresses.stablecoin, [
      'function balanceOf(address) view returns (uint256)'
    ], provider);
    const balance = await stablecoin.balanceOf(address);
    setUserBalance(formatCurrency(balance, 6));
  };

  const fetchData = async () => {
    if (!account || !contractAddresses.invoice || !contractAddresses.lendingPool) {
      alert('Please enter all contract addresses');
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    try {
      // Fetch invoices
      console.log("Invoice Address:", contractAddresses.invoice);
      console.log("Invoice ABI:", InvoiceABI);
      const invoiceContract = new ethers.Contract(contractAddresses.invoice, InvoiceABI, provider);
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
      const poolContract = new ethers.Contract(contractAddresses.lendingPool, LendingPoolABI, provider);
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

      await checkBalance(provider, account);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching data: ' + (error.message || error));
    }
  };

  const handleDeposit = async () => {
    if (!contractAddresses.stablecoin || !contractAddresses.lendingPool) return;
    const amount = prompt('Enter deposit amount in USDC:');
    if (!amount) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stablecoin = new ethers.Contract(contractAddresses.stablecoin, [
        'function approve(address, uint256) returns (bool)',
        'function decimals() view returns (uint8)'
      ], signer);

      const decimals = await stablecoin.decimals();
      const amountWei = ethers.parseUnits(amount, Number(decimals));

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
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">InvoiceFi</div>
          <div className="flex items-center gap-4">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {account && `${account.slice(0, 6)}...${account.slice(-4)}`}
            </span>
            <span className="text-sm font-medium">
              Balance: ${userBalance}
            </span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Configuration Panel */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Contract Configuration</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="label">Invoice Contract</label>
              <input
                type="text"
                className="input-field"
                placeholder="0x..."
                value={contractAddresses.invoice}
                onChange={(e) => setContractAddresses({...contractAddresses, invoice: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Lending Pool Contract</label>
              <input
                type="text"
                className="input-field"
                placeholder="0x..."
                value={contractAddresses.lendingPool}
                onChange={(e) => setContractAddresses({...contractAddresses, lendingPool: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Stablecoin Contract</label>
              <input
                type="text"
                className="input-field"
                placeholder="0x..."
                value={contractAddresses.stablecoin}
                onChange={(e) => setContractAddresses({...contractAddresses, stablecoin: e.target.value})}
              />
            </div>
          </div>
          <button
            onClick={fetchData}
            className="btn-primary mt-4"
          >
            Load Data
          </button>
        </div>

        {/* Pool Stats */}
        {poolStats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="card">
              <div className="text-gray-600 text-sm">Total Liquidity</div>
              <div className="text-2xl font-bold text-green-600">${formatCurrency(poolStats.totalLiquidity, 6)}</div>
            </div>
            <div className="card">
              <div className="text-gray-600 text-sm">Total Borrowed</div>
              <div className="text-2xl font-bold text-blue-600">${formatCurrency(poolStats.totalBorrowed, 6)}</div>
            </div>
            <div className="card">
              <div className="text-gray-600 text-sm">Available</div>
              <div className="text-2xl font-bold text-primary-600">${formatCurrency(poolStats.availableLiquidity, 6)}</div>
            </div>
            <div className="card">
              <div className="text-gray-600 text-sm">Active Loans</div>
              <div className="text-2xl font-bold text-purple-600">{poolStats.activeLoanCount}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'invoices' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices ({invoices.length})
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'loans' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('loans')}
          >
            My Loans ({loans.length})
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'lender' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('lender')}
          >
            Lender View
          </button>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Invoice #{invoice.id}</h3>
                    <p className="text-sm text-gray-600">
                      Buyer: {invoice.buyer.slice(0, 10)}...
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    invoice.status === 3 ? 'bg-green-100 text-green-800' :
                    invoice.status === 2 ? 'bg-blue-100 text-blue-800' :
                    invoice.status === 1 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {['Draft', 'Tokenized', 'Funded', 'Paid', 'Cancelled'][invoice.status]}
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
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
                      const amount = prompt('Enter borrow amount (max 90% of invoice):', (invoice.amount * 0.9).toString());
                      if (amount && contractAddresses.lendingPool) {
                        // Navigate to borrow logic here
                        alert('Borrow functionality implemented separately');
                      }
                    }}
                    className="btn-primary text-sm"
                  >
                    Borrow Against This Invoice
                  </button>
                )}
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="card text-center py-12">
                <p className="text-gray-600">No invoices found. Deploy and enter contract addresses above.</p>
              </div>
            )}
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {loans.map((loan) => (
              <div key={loan.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Loan #{loan.id}</h3>
                    <p className="text-sm text-gray-600">
                      For Invoice #{loan.tokenId}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    loan.repaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {loan.repaid ? 'Repaid' : 'Active'}
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Principal:</span>
                    <div className="font-semibold">${formatCurrency(loan.principal, 6)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Interest (5%):</span>
                    <div className="font-semibold">${formatCurrency(loan.interest, 6)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Owed:</span>
                    <div className="font-semibold">${formatCurrency(loan.principal + loan.interest, 6)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Repay By:</span>
                    <div className="font-semibold">{new Date(loan.repayBy * 1000).toLocaleDateString()}</div>
                  </div>
                </div>
                {!loan.repaid && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      This loan is active. When the buyer pays, ensure repayment is triggered.
                    </p>
                  </div>
                )}
              </div>
            ))}
            {loans.length === 0 && (
              <div className="card text-center py-12">
                <p className="text-gray-600">No active loans. Tokenize an invoice and borrow against it.</p>
                <a href="/create-invoice" className="btn-primary inline-block mt-4">
                  Create Invoice
                </a>
              </div>
            )}
          </div>
        )}

        {/* Lender Tab */}
        {activeTab === 'lender' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Provide Liquidity</h3>
              <p className="text-gray-600 mb-4">
                Deposit stablecoins into the lending pool to earn interest from borrowers.
              </p>
              <button
                onClick={handleDeposit}
                className="btn-primary"
              >
                Deposit Funds
              </button>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Available Invoices to Fund</h3>
              <p className="text-gray-600">
                Here you would see all tokenized invoices that are not yet funded,
                along with risk metrics and expected returns.
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  For MVP: Invoices are auto-funded from pool when borrowing occurs.
                  In production, lenders would select specific invoices.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}