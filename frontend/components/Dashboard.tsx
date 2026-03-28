import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { InvoiceABI, formatCurrency } from '../utils/contracts';

export default function Dashboard() {
  const [account, setAccount] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contractAddress, setContractAddress] = useState('');

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

  const fetchInvoices = async () => {
    if (!account || !contractAddress) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const invoiceContract = new ethers.Contract(contractAddress, InvoiceABI, provider);

    // For demo: assuming invoice IDs start from 0 and are sequential
    // In production, you'd index events or have a mapping
    try {
      const allInvoices = [];
      // Try to fetch up to 20 invoices
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
          break; // No more invoices
        }
      }
      setInvoices(allInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const getStatusLabel = (status: number) => {
    const labels = ['Draft', 'Tokenized', 'Funded', 'Paid', 'Cancelled'];
    return labels[status] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary-600">InvoiceFi</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {account && `${account.slice(0, 6)}...${account.slice(-4)}`}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Contract Address Input for Demo */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Demo Configuration</h2>
          <div>
            <label className="label">Invoice Contract Address</label>
            <input
              type="text"
              className="input-field"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-2">
              Enter the deployed Invoice contract address to view invoices
            </p>
          </div>
          <button
            onClick={fetchInvoices}
            className="btn-primary mt-4"
          >
            Load Invoices
          </button>
        </div>

        {/* Invoices List */}
        <div className="grid gap-6">
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
                  {getStatusLabel(invoice.status)}
                </span>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <div className="font-semibold">
                    {formatCurrency(invoice.amount, 6)} USDC
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <div className="font-semibold">
                    {new Date(invoice.dueDate * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Supplier:</span>
                  <div className="font-semibold text-xs">
                    {invoice.supplier.slice(0, 10)}...
                  </div>
                </div>
              </div>

              {invoice.status === 1 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This invoice is ready to be funded. Borrow against it from the lending pool.
                  </p>
                </div>
              )}
            </div>
          ))}

          {invoices.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-600">No invoices found. Enter contract address and click "Load Invoices".</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}