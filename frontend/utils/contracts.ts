export const InvoiceABI = [
  "function createInvoice(address buyer, uint256 amount, uint256 dueDate, string invoiceHash) returns (uint256)",
  "function markAsFunded(uint256 tokenId)",
  "function markAsPaid(uint256 tokenId)",
  "function getInvoice(uint256 tokenId) view returns (tuple(address supplier, address buyer, uint256 amount, uint256 dueDate, uint8 status, uint256 createdAt, bytes32 invoiceHash))",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event InvoiceCreated(uint256 indexed tokenId, address indexed supplier, address indexed buyer, uint256 amount, uint256 dueDate, bytes32 invoiceHash)",
];

export const LendingPoolABI = [
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function borrow(uint256 tokenId, uint256 borrowAmount) returns (uint256)",
  "function repay(uint256 loanId)",
  "function simulateBuyerPayment(uint256 tokenId)",
  "function getPoolStats() view returns (uint256 totalLiquidity, uint256 totalBorrowed, uint256 availableLiquidity, uint256 totalInterestEarned, uint256 activeLoanCount)",
  "function getBorrowerLoans(address borrower) view returns (uint256[])",
  "function loans(uint256 loanId) view returns (tuple(uint256 tokenId, address borrower, address lender, uint256 principal, uint256 interest, uint256 startTime, uint256 repayBy, bool repaid))",
  "event Deposited(address indexed lender, uint256 amount)",
  "event Withdrawn(address indexed lender, uint256 amount)",
  "event Borrowed(uint256 indexed loanId, address indexed borrower, uint256 indexed tokenId, uint256 principal, uint256 interest)",
  "event Repaid(uint256 indexed loanId, uint256 principal, uint256 interest)",
];

export const StablecoinABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount)",
];

export const CONTRACT_ADDRESSES = {
  localhost: {
    invoice: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
    lendingPool: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
    stablecoin: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  }
};

export function formatCurrency(value: bigint | string, decimals: number = 6) {
  const num = typeof value === 'bigint' ? value : BigInt(value);
  return (Number(num) / 10 ** decimals).toFixed(2);
}

export async function getContract(abi: any, address: string, signer?: any) {
  const { ethers } = await import('ethers');
  if (!window.ethereum) throw new Error('MetaMask not found');
  const provider = new ethers.BrowserProvider(window.ethereum);
  if (signer) {
    const signerInstance = await provider.getSigner();
    return new ethers.Contract(address, abi, signerInstance);
  }
  return new ethers.Contract(address, abi, provider);
}