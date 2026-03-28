// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Invoice.sol";

contract LendingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BORROW_RATE = 500; // 5% per loan term (basis points)
    uint256 public constant LOAN_TERM = 30 days;

    struct Loan {
        uint256 tokenId;
        address borrower;
        address lender;
        uint256 principal;
        uint256 interest;
        uint256 startTime;
        uint256 repayBy;
        bool repaid;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256) public lenderBalances;

    Invoice public invoiceContract;
    IERC20 public stablecoin;

    uint256 public nextLoanId = 1;
    uint256 public loanFeeBasisPoints = 50; // 0.5%

    event Deposited(address indexed lender, uint256 amount);
    event Withdrawn(address indexed lender, uint256 amount);
    event Borrowed(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 principal,
        uint256 interest
    );
    event Repaid(uint256 indexed loanId, uint256 principal, uint256 interest);
    event InvoiceFunded(uint256 indexed tokenId, uint256 amount);

    error InvalidAmount();
    error InvoiceNotTokenized();
    error InvoiceAlreadyFunded();
    error LoanNotFound();
    error NotLoanBorrower();

    constructor(address _invoiceContract, address _stablecoin) Ownable() {
        invoiceContract = Invoice(_invoiceContract);
        stablecoin = IERC20(_stablecoin);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        lenderBalances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        require(lenderBalances[msg.sender] >= amount, "Insufficient balance");
        uint256 contractBalance = stablecoin.balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient contract liquidity");
        lenderBalances[msg.sender] -= amount;
        stablecoin.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function borrow(uint256 tokenId, uint256 borrowAmount) external nonReentrant returns (uint256 loanId) {
        Invoice.InvoiceData memory invoice = invoiceContract.getInvoice(tokenId);

        if (invoice.supplier == address(0)) revert InvoiceNotTokenized();
        if (invoice.status != Invoice.InvoiceStatus.TOKENIZED) revert InvoiceAlreadyFunded();
        if (msg.sender != invoice.supplier) revert NotLoanBorrower();

        require(borrowAmount > 0 && borrowAmount <= invoice.amount, "Invalid borrow amount");
        uint256 contractBalance = stablecoin.balanceOf(address(this));
        require(borrowAmount <= contractBalance, "Insufficient pool liquidity");

        uint256 interest = (borrowAmount * BORROW_RATE) / 10000;
        loanId = nextLoanId++;
        loans[loanId] = Loan({
            tokenId: tokenId,
            borrower: msg.sender,
            lender: address(0),
            principal: borrowAmount,
            interest: interest,
            startTime: block.timestamp,
            repayBy: block.timestamp + LOAN_TERM,
            repaid: false
        });

        borrowerLoans[msg.sender].push(loanId);
        invoiceContract.markAsFunded(tokenId);

        uint256 protocolFee = (borrowAmount * loanFeeBasisPoints) / 10000;
        uint256 netAmount = borrowAmount - protocolFee;
        stablecoin.safeTransfer(msg.sender, netAmount);

        emit Borrowed(loanId, msg.sender, tokenId, borrowAmount, interest);
        emit InvoiceFunded(tokenId, borrowAmount);
    }

    function repay(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loanId > 0, "Invalid loan ID");
        require(loan.borrower != address(0), "Loan does not exist");
        if (loan.repaid) revert InvalidAmount();
        require(block.timestamp <= loan.repayBy, "Repayment deadline passed");

        uint256 totalOwed = loan.principal + loan.interest;
        // Since lender is address(0), send repayment to the pool contract itself
        // Liquidity providers can withdraw proportionally from the pool
        stablecoin.safeTransferFrom(msg.sender, address(this), totalOwed);
        loan.repaid = true;
        emit Repaid(loanId, loan.principal, loan.interest);
    }

    function simulateBuyerPayment(uint256 tokenId) external onlyOwner {
        uint256 loanId;
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].tokenId == tokenId && !loans[i].repaid) {
                loanId = i;
                break;
            }
        }
        if (loanId == 0) revert LoanNotFound();

        Loan storage loan = loans[loanId];
        stablecoin.safeTransfer(loan.lender, loan.principal + loan.interest);
        loan.repaid = true;
        invoiceContract.markAsPaid(tokenId);
    }

    function getActiveLoanCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].tokenId != 0 && !loans[i].repaid) {
                count++;
            }
        }
        return count;
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getPoolStats() external view returns (
        uint256 totalLiquidity,
        uint256 totalBorrowed,
        uint256 availableLiquidity,
        uint256 totalInterestEarned,
        uint256 activeLoanCount
    ) {
        // Calculate total liquidity from all lender balances
        totalLiquidity = stablecoin.balanceOf(address(this));
        
        // Calculate total borrowed and interest from active loans
        totalBorrowed = 0;
        totalInterestEarned = 0;
        activeLoanCount = 0;
        
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].tokenId != 0 && !loans[i].repaid) {
                totalBorrowed += loans[i].principal;
                totalInterestEarned += loans[i].interest;
                activeLoanCount++;
            }
        }
        
        // Available liquidity is current balance minus loaned out amounts
        availableLiquidity = totalLiquidity > totalBorrowed ? totalLiquidity - totalBorrowed : 0;
    }

    receive() external payable { revert("Do not send ETH"); }
    fallback() external payable { revert("Invalid call"); }
}