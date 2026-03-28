const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Invoice", function () {
  async function deployInvoiceFixture() {
    const [supplier, buyer, lender] = await ethers.getSigners();

    const Invoice = await ethers.getContractFactory("Invoice");
    const invoice = await Invoice.deploy();

    return { supplier, buyer, lender, invoice };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { invoice } = await loadFixture(deployInvoiceFixture);
      expect(await invoice.name()).to.equal("SupplyChainInvoice");
      expect(await invoice.symbol()).to.equal("INV");
    });
  });

  describe("createInvoice", function () {
    it("Should create an invoice and mint NFT", async function () {
      const { invoice, supplier, buyer } = await loadFixture(deployInvoiceFixture);

      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
      const invoiceHash = "QmTest123456789";
      const hash = ethers.keccak256(ethers.toUtf8Bytes(invoiceHash));

      await expect(
        invoice.createInvoice(buyer.address, amount, dueDate, invoiceHash)
      )
        .to.emit(invoice, "InvoiceCreated")
        .withArgs(0, supplier.address, buyer.address, amount, dueDate, hash);

      expect(await invoice.tokenURI(0)).to.equal(invoiceHash);
      expect(await invoice.ownerOf(0)).to.equal(supplier.address);
    });

    it("Should reject zero buyer address", async function () {
      const { invoice, supplier } = await loadFixture(deployInvoiceFixture);

      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoiceHash = "QmTest123456789";

      await expect(
        invoice.createInvoice(ethers.ZeroAddress, amount, dueDate, invoiceHash)
      ).to.be.revertedWith("Buyer cannot be zero address");
    });

    it("Should prevent duplicate invoice hashes", async function () {
      const { invoice, supplier, buyer } = await loadFixture(deployInvoiceFixture);

      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoiceHash = "QmTest123456789";

      await invoice.createInvoice(buyer.address, amount, dueDate, invoiceHash);

      await expect(
        invoice.createInvoice(buyer.address, amount, dueDate, invoiceHash)
      ).to.be.revertedWith("Invoice already tokenized");
    });
  });

  describe("Invoice lifecycle", function () {
    it("Should allow supplier to cancel tokenized invoice", async function () {
      const { invoice, supplier, buyer } = await loadFixture(deployInvoiceFixture);

      const amount = ethers.parseEther("10000");
      const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const invoiceHash = "QmTestCancel";

      await invoice.createInvoice(buyer.address, amount, dueDate, invoiceHash);
      await invoice.cancelInvoice(0);

      expect((await invoice.getInvoice(0)).status).to.equal(4); // CANCELLED
    });
  });
});