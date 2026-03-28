import Link from 'next/link';
import { ReactNode } from 'react';
import { useRouter } from 'next/router';

interface NavbarProps {
  account?: string | null;
  balanceLabel?: string;
  rightContent?: ReactNode;
}

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/create-invoice', label: 'Create Invoice' },
  { href: '/lender', label: 'Lender' },
];

export default function Navbar({ account, balanceLabel, rightContent }: NavbarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">
            InvoiceFi
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {balanceLabel && <span className="hidden text-sm text-gray-600 md:inline">{balanceLabel}</span>}
          {account && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          )}
          {rightContent}
        </div>
      </div>
    </header>
  );
}