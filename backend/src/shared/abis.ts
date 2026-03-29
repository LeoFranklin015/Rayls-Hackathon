export const COLLATERAL_REGISTRY_ABI = [
  "function addCollateral(bytes32 ownerId, uint256 loanAmount, uint256 timeDays, uint256 startTimestamp, uint256 interest, uint256 yield_, uint8 colType, string info) returns (uint256)",
  "function updateCollateral(uint256 id, uint256 loanAmount, uint256 timeDays, uint256 startTimestamp, uint256 interest, uint256 yield_, uint8 colType, string info)",
  "function removeCollateral(uint256 id)",
  "function getCollateral(uint256 id) view returns (tuple(bytes32 ownerId, uint256 loanAmount, uint256 timeDays, uint256 startTimestamp, uint256 interest, uint256 yield_, uint8 colType, string info, bool active))",
  "function getActiveCollaterals() view returns (uint256[])",
  "function getCollateralsByOwner(bytes32 ownerId) view returns (uint256[])",
  "function nextId() view returns (uint256)",
  "event CollateralAdded(uint256 indexed id, bytes32 indexed ownerId, uint8 colType, uint256 loanAmount)",
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function teleportToPublicChain(address to, uint256 amount, uint256 chainId)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(address to, uint256 tokenId)",
  "function burn(uint256 tokenId)",
  "function teleportToPublicChain(address to, uint256 tokenId, uint256 chainId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

export const ERC1155_ABI = [
  "function name() view returns (string)",
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function mint(address to, uint256 id, uint256 amount, bytes data)",
  "function burn(address from, uint256 id, uint256 amount)",
  "function teleportToPublicChain(address to, uint256 id, uint256 amount, uint256 chainId, bytes data)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
];

export const ATTESTATION_ABI = [
  "function attest(address token, bool approved, string reason, uint256 score)",
  "function getAttestations(address token) view returns (tuple(address attester, address token, bool approved, string reason, uint256 score, uint256 timestamp)[])",
  "function getAttestationCount(address token) view returns (uint256)",
  "event Attested(address indexed token, address indexed attester, bool approved, uint256 score)",
];

export const MARKETPLACE_ABI = [
  "function list(address token, uint8 assetType, uint256 tokenId, uint256 amount, uint256 price) returns (uint256)",
  "function update(uint256 listingId, uint256 newPrice)",
  "function delist(uint256 listingId)",
  "function buy(uint256 listingId) payable",
  "function buyFraction(uint256 listingId, uint256 amount) payable",
  "function setRedemptionVault(address _vault)",
  "function getListing(uint256 listingId) view returns (tuple(address token, uint8 assetType, uint256 tokenId, uint256 amount, uint256 price, bool active))",
  "function getActiveListings() view returns (uint256[])",
  "function nextListingId() view returns (uint256)",
  "function redemptionVault() view returns (address)",
  "event Listed(uint256 indexed listingId, address indexed token, uint8 assetType, uint256 price)",
  "event Updated(uint256 indexed listingId, uint256 newPrice)",
  "event Delisted(uint256 indexed listingId)",
  "event Bought(uint256 indexed listingId, address indexed buyer, uint256 price)",
  "event BoughtFraction(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 totalPrice)",
];

export const COLLATERAL_TOKEN_ABI = [
  ...ERC1155_ABI,
  "function bankName() view returns (string)",
  "function tokenize(uint256 collateralId, uint256 maxTokenCount)",
  "function getTokenizedCollateral(uint256 collateralId) view returns (tuple(uint256 collateralId, uint256 maxTokenCount, uint256 pricePerToken, uint256 totalValue, uint256 yieldBasisPoints, bool tokenized))",
  "function getTokenizedIds() view returns (uint256[])",
  "event Tokenized(uint256 indexed collateralId, uint256 maxTokenCount, uint256 pricePerToken, uint256 totalValue, uint256 yieldBasisPoints)",
];

export const REDEMPTION_VAULT_ABI = [
  "function bank() view returns (address)",
  "function collateralToken() view returns (address)",
  "function marketplace() view returns (address)",
  "function registerPurchase(uint256 collateralId, address buyer, uint256 amount)",
  "function fillCollateral(uint256 collateralId, uint256 pricePerToken, uint256 yieldBasisPoints) payable",
  "function fractionsSold(uint256 collateralId) view returns (uint256)",
  "function holdings(uint256 collateralId, address holder) view returns (uint256)",
  "function filled(uint256 collateralId) view returns (bool)",
  "function isFilled(uint256 collateralId) view returns (bool)",
  "function getHolders(uint256 collateralId) view returns (address[])",
  "function getHolderCount(uint256 collateralId) view returns (uint256)",
  "function pendingWithdrawals(address holder) view returns (uint256)",
  "function withdraw()",
  "event PurchaseRegistered(uint256 indexed collateralId, address indexed buyer, uint256 amount)",
  "event CollateralFilled(uint256 indexed collateralId, uint256 totalPaid, uint256 holderCount)",
  "event YieldPaid(uint256 indexed collateralId, address indexed holder, uint256 amount, uint256 payout)",
  "event TransferFailed(uint256 indexed collateralId, address indexed holder, uint256 payout)",
];
