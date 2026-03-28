import { useState } from 'react';
import Head from 'next/head';
import WalletConnect from '../components/WalletConnect';
import Link from 'next/link';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  return (
    <>
      <Head>
        <title>InvoiceFi - DeFi for B2B Supply Chains</title>
        <meta name="description" content="Unlock working capital for every supplier through decentralized invoice financing" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="text-2xl font-bold text-primary-600">InvoiceFi</div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-primary-600 font-medium">
                Dashboard
              </Link>
              <WalletConnect onConnect={setWalletAddress} />
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Unlock Working Capital
            <br />
            <span className="text-primary-600">For Every Supplier</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Small and mid-sized suppliers are forced to wait 60–120 days for invoice payments,
            creating severe cash flow crises. InvoiceFi tokenizes unpaid invoices as on-chain assets,
            enabling instant access to liquidity from decentralized lending pools.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link href="/create-invoice" className="btn-primary text-lg">
              Create Invoice
            </Link>
            <Link href="/lender" className="btn-secondary text-lg">
              Provide Liquidity
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20">
            <div className="card">
              <div className="text-4xl font-bold text-primary-600 mb-2">60-120</div>
              <div className="text-gray-600">Days payment delay</div>
            </div>
            <div className="card">
              <div className="text-4xl font-bold text-primary-600 mb-2">$240B+</div>
              <div className="text-gray-600">Indian MSME credit gap</div>
            </div>
            <div className="card">
              <div className="text-4xl font-bold text-primary-600 mb-2">5%</div>
              <div className="text-gray-600">Interest rate (vs 18-36% banks)</div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-600 mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Tokenize Invoice</h3>
                <p className="text-gray-600">
                  Supplier creates invoice NFT representing unpaid receivable from a verified buyer
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-600 mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Access Liquidity</h3>
                <p className="text-gray-600">
                  Borrow instantly against invoice from decentralized lending pool (up to 90% value)
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-600 mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Auto Repayment</h3>
                <p className="text-gray-600">
                  When buyer pays, smart contract automatically repays loan + interest to lenders
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Ready to transform your cash flow?</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/create-invoice" className="btn-primary text-lg">
                Get Started
              </Link>
              <Link href="/dashboard" className="btn-secondary text-lg">
                View Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="container mx-auto px-4 text-center">
            <p>InvoiceFi - Decentralized Supply Chain Finance</p>
            <p className="text-sm mt-2">Built for Hackathon 2025</p>
          </div>
        </footer>
      </main>
    </>
  );
}