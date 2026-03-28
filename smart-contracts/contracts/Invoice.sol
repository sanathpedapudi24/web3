// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Invoice is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    enum InvoiceStatus { DRAFT, TOKENIZED, FUNDED, PAID, CANCELLED }

    struct InvoiceData {
        address payable supplier;
        address buyer;
        uint256 amount;
        uint256 dueDate;
        InvoiceStatus status;
        uint256 createdAt;
        bytes32 invoiceHash; // keccak256 of IPFS CID
    }

    mapping(uint256 => InvoiceData) public invoices;
    mapping(bytes32 => bool) public invoiceHashExists;

    event InvoiceCreated(
        uint256 indexed tokenId,
        address indexed supplier,
        address indexed buyer,
        uint256 amount,
        uint256 dueDate,
        bytes32 invoiceHash
    );
    event InvoiceStatusChanged(uint256 indexed tokenId, InvoiceStatus status);

    constructor() ERC721("SupplyChainInvoice", "INV") Ownable() {}

    function createInvoice(
        address buyer,
        uint256 amount,
        uint256 dueDate,
        string memory invoiceHash
    ) external returns (uint256 tokenId) {
        require(buyer != address(0), "Buyer cannot be zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in future");
        require(bytes(invoiceHash).length > 0, "Invoice hash required");

        bytes32 hash = keccak256(abi.encodePacked(invoiceHash));
        require(!invoiceHashExists[hash], "Invoice already tokenized");

        tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        invoices[tokenId] = InvoiceData({
            supplier: payable(msg.sender),
            buyer: buyer,
            amount: amount,
            dueDate: dueDate,
            status: InvoiceStatus.TOKENIZED,
            createdAt: block.timestamp,
            invoiceHash: hash
        });

        invoiceHashExists[hash] = true;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, invoiceHash);

        emit InvoiceCreated(tokenId, msg.sender, buyer, amount, dueDate, hash);
    }

    function markAsFunded(uint256 tokenId) external {
        InvoiceData storage invoice = invoices[tokenId];
        require(invoice.supplier != address(0), "Invoice does not exist");
        require(invoice.status == InvoiceStatus.TOKENIZED, "Invoice not tokenized");
        invoice.status = InvoiceStatus.FUNDED;
        emit InvoiceStatusChanged(tokenId, InvoiceStatus.FUNDED);
    }

    function markAsPaid(uint256 tokenId) external {
        InvoiceData storage invoice = invoices[tokenId];
        require(invoice.supplier != address(0), "Invoice does not exist");
        require(invoice.status == InvoiceStatus.FUNDED, "Invoice not funded");
        require(
            msg.sender == invoice.buyer || msg.sender == owner(),
            "Not authorized"
        );
        invoice.status = InvoiceStatus.PAID;
        emit InvoiceStatusChanged(tokenId, InvoiceStatus.PAID);
    }

    function cancelInvoice(uint256 tokenId) external {
        InvoiceData storage invoice = invoices[tokenId];
        require(invoice.supplier != address(0), "Invoice does not exist");
        require(invoice.status == InvoiceStatus.TOKENIZED, "Invoice not tokenized");
        require(msg.sender == invoice.supplier, "Not authorized");
        invoice.status = InvoiceStatus.CANCELLED;
        emit InvoiceStatusChanged(tokenId, InvoiceStatus.CANCELLED);
    }

    function getInvoice(uint256 tokenId) external view returns (InvoiceData memory) {
        require(invoices[tokenId].supplier != address(0), "Invoice does not exist");
        return invoices[tokenId];
    }

    // Required overrides for v4
    function _burn(uint256 tokenId) internal virtual override(ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}