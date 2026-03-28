import { useState } from 'react';
import Head from 'next/head';
import WalletConnect from '../components/WalletConnect';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  return (
    <>
      <Head>
        <title>InvoiceFi - DeFi for B2B Supply Chains</title>
        <meta name="description" content="Unlock working capital for every supplier through decentralized invoice financing" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar
          account={walletAddress}
          rightContent={<WalletConnect onConnect={setWalletAddress} />}
        />

        <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center md:py-24">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">
            Invoice financing for modern supply chains
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-gray-600">
            Convert unpaid invoices into financing-ready on-chain assets, get early liquidity,
            and keep repayment transparent for all participants.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/create-invoice"
              className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700"
            >
              Create Invoice
            </Link>
            <Link
              href="/lender"
              className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100"
            >
              Provide Liquidity
            </Link>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:scale-[1.02]">
              <div className="text-3xl font-semibold text-gray-900">60-120</div>
              <p className="mt-2 text-sm text-gray-600">Typical payment delay in B2B invoicing</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:scale-[1.02]">
              <div className="text-3xl font-semibold text-gray-900">$240B+</div>
              <p className="mt-2 text-sm text-gray-600">Estimated MSME credit gap in India</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:scale-[1.02]">
              <div className="text-3xl font-semibold text-gray-900">5%</div>
              <p className="mt-2 text-sm text-gray-600">Target lending rate for faster access</p>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">How it works</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                {
                  title: 'Tokenize invoice',
                  description:
                    'Suppliers mint an invoice NFT that represents a verified receivable.',
                },
                {
                  title: 'Borrow from pool',
                  description:
                    'Lending liquidity is allocated against that invoice with transparent terms.',
                },
                {
                  title: 'Auto settlement',
                  description:
                    'When payment arrives, repayment and interest distribution happen on-chain.',
                },
              ].map((item, idx) => (
                <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                    {idx + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-gray-200 bg-white p-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Start in minutes</h2>
              <p className="mt-2 text-sm text-gray-600">
                Connect wallet, create invoice, and manage the full financing flow from your dashboard.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/create-invoice"
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700"
              >
                Get Started
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}