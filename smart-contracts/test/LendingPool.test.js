const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("LendingPool", function () {
  async function deployLendingPoolFixture() {
    const [supplier, buyer, lender, liquidityProvider] = await ethers.getSigners();

    // Deploy dependencies
    const MockUSDC = await ethers.getContractFactory("MockStablecoin");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    const Invoice = await ethers.getContractFactory("Invoice");
    const invoice = await Invoice.deploy();

    const LendingPool = await ethers.getContractFactory("LendingPool");
    const pool = await LendingPool.deploy(invoice.target, mockUSDC.target);

    // Mint test tokens
    const amount = ethers.parseEther("10000");
    await mockUSDC.mint(supplier.address, amount);
    await mockUSDC.mint(lender.address, amount);
    await mockUSDC.mint(liquidityProvider.address, amount * 10n);

    return {
      supplier,
      buyer,
      lender,
      liquidityProvider,
      mockUSDC,
      invoice,
      pool
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct contracts", async function () {
      const { invoice, mockUSDC, pool } = await loadFixture(deployLendingPoolFixture);

      expect(await pool.invoiceContract()).to.equal(await invoice.target);
      expect(await pool.stablecoin()).to.equal(await mockUSDC.target);
    });
  });

  describe("Deposits & Withdrawals", function () {
    it("Should allow liquidity providers to deposit funds", async function () {
      const { liquidityProvider, mockUSDC, pool } = await loadFixture(deployLendingPoolFixture);

      const depositAmount = ethers.parseEther("1000");
      await mockUSDC.connect(liquidityProvider).approve(pool.target, depositAmount);

      await expect(pool.connect(liquidityProvider).deposit(depositAmount))
        .to.emit(pool, "Deposited")
        .withArgs(liquidityProvider.address, depositAmount);

      const stats = await pool.getPoolStats();
      expect(stats.totalLiquidity).to.equal(depositAmount);
    });

    it("Should allow withdrawal of available liquidity", async function () {
      const { liquidityProvider, mockUSDC, pool } = await loadFixture(deployLendingPoolFixture);

      const depositAmount = ethers.parseEther("1000");
      await mockUSDC.connect(liquidityProvider).approve(pool.target, depositAmount);
      await pool.connect(liquidityProvider).deposit(depositAmount);

      await pool.connect(liquidityProvider).withdraw(depositAmount);

      const stats = await pool.getPoolStats();
      expect(stats.totalLiquidity).to.equal(0);
    });
  });

  describe("Borrowing", function () {
    it("Should allow supplier to borrow against tokenized invoice", async function () {
      const { supplier, buyer, liquidityProvider, mockUSDC, invoice, pool } = await loadFixture(deployLendingPoolFixture);

      // Create invoice
      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoiceHash = "QmBorrowTest";
      const hash = ethers.keccak256(ethers.toUtf8Bytes(invoiceHash));
      await invoice.createInvoice(buyer.address, amount, dueDate, invoiceHash);

      // Deposit liquidity
      const depositAmount = ethers.parseEther("5000");
      await mockUSDC.connect(liquidityProvider).approve(pool.target, depositAmount);
      await pool.connect(liquidityProvider).deposit(depositAmount);

      // Borrow 50% of invoice
      const borrowAmount = amount / 2n;
      const expectedInterest = (borrowAmount * 500n) / 10000n; // BORROW_RATE = 500 (5%)
      await expect(pool.connect(supplier).borrow(0, borrowAmount))
        .to.emit(pool, "Borrowed")
        .withArgs(1, supplier.address, 0, borrowAmount, expectedInterest);

      // Check loan created
      const loan = await pool.loans(1);
      expect(loan.principal).to.equal(borrowAmount);
      expect(loan.repaid).to.equal(false);
    });

    it("Should mark invoice as funded after borrowing", async function () {
      const { supplier, buyer, liquidityProvider, mockUSDC, invoice, pool } = await loadFixture(deployLendingPoolFixture);

      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoiceHash = "QmBorrowTest2";
      await invoice.createInvoice(buyer.address, amount, dueDate, invoiceHash);

      const depositAmount = ethers.parseEther("5000");
      await mockUSDC.connect(liquidityProvider).approve(pool.target, depositAmount);
      await pool.connect(liquidityProvider).deposit(depositAmount);

      const borrowAmount = amount / 2n;
      await pool.connect(supplier).borrow(0, borrowAmount);

      const invoiceData = await invoice.getInvoice(0);
      expect(invoiceData.status).to.equal(2); // FUNDED (status enum: DRAFT=0, TOKENIZED=1, FUNDED=2)
    });
  });

  describe("Repayment", function () {
    it("Should allow repayment of loan", async function () {
      const { supplier, buyer, liquidityProvider, mockUSDC, invoice, pool } = await loadFixture(deployLendingPoolFixture);

      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      await invoice.createInvoice(buyer.address, amount, dueDate, "QmRepayTest");

      const depositAmount = ethers.parseEther("5000");
      await mockUSDC.connect(liquidityProvider).approve(pool.target, depositAmount);
      await pool.connect(liquidityProvider).deposit(depositAmount);

      const borrowAmount = amount / 2n;
      await pool.connect(supplier).borrow(0, borrowAmount);

      const loan = await pool.loans(1);
      const totalOwed = loan.principal + loan.interest; // borrow + 5%

      // Approve repayment
      await mockUSDC.connect(supplier).approve(pool.target, totalOwed);
      await pool.connect(supplier).repay(1);

      const updatedLoan = await pool.loans(1);
      expect(updatedLoan.repaid).to.equal(true);
    });
  });
});