import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { InvoiceABI } from '../utils/contracts';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import WalletConnect from '../components/WalletConnect';

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
        const accounts = await provider.send('eth_accounts', []);
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

    if (!(window as any).ethereum) {
      alert('MetaMask is not detected. Please install or enable MetaMask first.');
      return;
    }

    if (!account) {
      alert('Please connect your wallet before creating an invoice.');
      return;
    }

    if (!contractAddress.trim()) {
      alert('Please enter the Invoice contract address.');
      return;
    }

    if (!formData.buyerAddress || !ethers.isAddress(formData.buyerAddress)) {
      alert('Please enter a valid buyer wallet address.');
      return;
    }

    const parsedAmount = Number(formData.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Please enter a valid invoice amount greater than 0.');
      return;
    }

    if (!formData.dueDate) {
      alert('Please select a due date.');
      return;
    }

    const dueDateTimestamp = Math.floor(new Date(formData.dueDate).getTime() / 1000);
    if (!dueDateTimestamp || dueDateTimestamp <= Math.floor(Date.now() / 1000)) {
      alert('Please choose a due date in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const invoiceContract = new ethers.Contract(contractAddress, InvoiceABI, signer);

      const amountWei = ethers.parseUnits(formData.amount, 6);

      const metadata = {
        invoiceNumber: formData.invoiceNumber,
        description: formData.description,
        supplier: account,
        buyer: formData.buyerAddress,
        amount: formData.amount,
        currency: 'USDC',
        createdAt: new Date().toISOString(),
      };

      const invoiceHash = `Qm${Buffer.from(JSON.stringify(metadata)).toString('hex').slice(0, 44)}`;

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
      <Navbar
        account={account}
        rightContent={<WalletConnect onConnect={(address) => setAccount(address || null)} />}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Create Invoice</h1>
          <p className="mt-1 text-sm text-gray-600">
            Tokenize your unpaid invoice and access funding from the lending pool.
          </p>

          {!account && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Connect your wallet to create and submit invoices.
            </div>
          )}

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Demo Setup</h3>
              <p className="mt-1 text-xs text-amber-800">
                Enter your deployed Invoice contract address before submitting.
              </p>
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Invoice Contract Address</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="0x..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Buyer Address *</label>
                <input
                  type="text"
                  name="buyerAddress"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="0x..."
                  value={formData.buyerAddress}
                  onChange={handleInputChange}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Wallet that will repay this invoice.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Invoice Amount (USDC) *</label>
                  <input
                    type="number"
                    name="amount"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="10000"
                    min="1"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Invoice Number *</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="INV-2024-001"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description *</label>
                <textarea
                  name="description"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  rows={3}
                  placeholder="Description of goods/services provided..."
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Invoice Summary</h3>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <span className="text-gray-600">Supplier</span>
                    <p className="mt-0.5 font-mono text-xs text-gray-800">{account || 'Not connected'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Buyer</span>
                    <p className="mt-0.5 font-mono text-xs text-gray-800">{formData.buyerAddress || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount</span>
                    <p className="mt-0.5 font-medium text-gray-900">${formData.amount || '0'} USDC</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date</span>
                    <p className="mt-0.5 text-gray-900">{formData.dueDate || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating Invoice...' : 'Create Invoice'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h3 className="text-sm font-semibold text-blue-900">What happens next?</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-blue-800">
              <li>1. Your invoice is minted as an ERC-721 token.</li>
              <li>2. It becomes financing-ready in the lending flow.</li>
              <li>3. Repayments settle on-chain with transparent status updates.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
