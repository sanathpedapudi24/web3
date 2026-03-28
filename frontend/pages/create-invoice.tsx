import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { InvoiceABI } from '../utils/contracts';
import { useRouter } from 'next/router';

export default function CreateInvoice() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    buyerAddress: '',
    amount: '',
    dueDate: '',
    invoiceNumber: '',
    description: '',
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !contractAddress) {
      alert('Please connect wallet and enter contract address');
      return;
    }

    setIsSubmitting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const invoiceContract = new ethers.Contract(contractAddress, InvoiceABI, signer);

      const amountWei = ethers.parseUnits(formData.amount, 6);
      const dueDateTimestamp = Math.floor(new Date(formData.dueDate).getTime() / 1000);

      // Create invoice metadata for IPFS (simplified for demo)
      const metadata = {
        invoiceNumber: formData.invoiceNumber,
        description: formData.description,
        supplier: account,
        buyer: formData.buyerAddress,
        amount: formData.amount,
        currency: 'USDC',
        createdAt: new Date().toISOString(),
      };

      // For MVP, we'll use a simple hash instead of actual IPFS upload
      // In production: upload to Pinata and get CID
      const invoiceHash = `Qm${Buffer.from(JSON.stringify(metadata)).toString('hex').slice(0, 44)}`;

      console.log('Creating invoice with metadata:', metadata);
      console.log('Hash:', invoiceHash);

      const tx = await invoiceContract.createInvoice(
        formData.buyerAddress,
        amountWei,
        dueDateTimestamp,
        invoiceHash
      );

      await tx.wait();
      alert('Invoice created successfully! Token ID: ' + (await invoiceContract.tokenURI(0)));
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
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
            {account && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Create Invoice</h1>
        <p className="text-gray-600 mb-8">Tokenize your unpaid invoice as an NFT to access instant liquidity</p>

        <div className="card">
          {/* Demo Configuration */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Demo Setup</h3>
            <div>
              <label className="label">Invoice Contract Address</label>
              <input
                type="text"
                className="input-field"
                placeholder="0x..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
              />
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              Enter your deployed Invoice contract address to create invoices.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Buyer Address *</label>
              <input
                type="text"
                name="buyerAddress"
                className="input-field"
                placeholder="0x..."
                value={formData.buyerAddress}
                onChange={handleInputChange}
                required
              />
              <p className="text-sm text-gray-500 mt-1">The buyer who will pay this invoice</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Invoice Amount (USDC) *</label>
                <input
                  type="number"
                  name="amount"
                  className="input-field"
                  placeholder="10000"
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="label">Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Invoice Number *</label>
              <input
                type="text"
                name="invoiceNumber"
                className="input-field"
                placeholder="INV-2024-001"
                value={formData.invoiceNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                name="description"
                className="input-field"
                rows={3}
                placeholder="Description of goods/services provided..."
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Invoice Summary</h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Supplier:</span>
                  <p className="font-mono text-xs">{account || 'Not connected'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Buyer:</span>
                  <p className="font-mono text-xs">{formData.buyerAddress || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <p className="font-semibold">${formData.amount || '0'} USDC</p>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <p>{formData.dueDate || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1"
              >
                {isSubmitting ? 'Creating Invoice...' : 'Create Invoice & Tokenize'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>1. Your invoice will be minted as an NFT (ERC-721) on Polygon</li>
            <li>2. You can then borrow against this invoice from the lending pool</li>
            <li>3. When the buyer pays, the loan will auto-repay and you'll receive remaining funds</li>
          </ul>
        </div>
      </main>
    </div>
  );
}