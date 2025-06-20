# CreditShaft Contract Changes - Frontend Integration Update

## 🚨 **BREAKING CHANGES**

### ⚠️ **Critical Function Changes**

#### `repayLoan()` Function - REQUIRES LOAN ID NOW
**BEFORE:**
```solidity
function repayLoan() external payable
```

**AFTER:**
```solidity
function repayLoan(uint256 loanId) external payable
```

**Impact:** Frontend must now specify which loan to repay by providing the loan ID.

## 📋 **New Functions Added**

### **Core Data Functions (Use These for Frontend)**

#### 1. `getUserLoans(address user)`
```solidity
function getUserLoans(address user) external view returns (uint256[] memory)
```
- **Purpose:** Get all loan IDs for a specific user
- **Use Case:** Initial data loading, user dashboard

#### 2. `getLoanDetails(uint256 loanId)`
```solidity
function getLoanDetails(uint256 loanId) external view returns (
    address borrower,
    uint256 borrowedETH,
    uint256 preAuthAmountUSD,
    uint256 currentInterest,
    uint256 totalRepayAmount,
    uint256 createdAt,
    uint256 preAuthExpiry,
    bool isActive,
    bool isExpired
)
```
- **Purpose:** Get complete information about a specific loan
- **Use Case:** Loan detail pages, repayment calculations

#### 3. `getActiveLoansForUser(address user)`
```solidity
function getActiveLoansForUser(address user) external view returns (
    uint256[] memory activeLoans, 
    uint256 count
)
```
- **Purpose:** Get only loans with outstanding debt
- **Use Case:** Repayment interfaces, active loan displays

#### 4. `getRepayAmount(uint256 loanId)`
```solidity
function getRepayAmount(uint256 loanId) external view returns (uint256)
```
- **Purpose:** Get exact amount needed to repay a specific loan
- **Use Case:** Repayment transactions, UI amount displays

#### 5. `hasActiveLoan(address user)`
```solidity
function hasActiveLoan(address user) external view returns (bool)
```
- **Purpose:** Quick check if user has any active loans
- **Use Case:** Conditional UI rendering, user state checks

#### 6. `getUserLPBalance(address user)`
```solidity
function getUserLPBalance(address user) external view returns (
    uint256 shares, 
    uint256 value
)
```
- **Purpose:** Get LP token balance and ETH value for any user
- **Use Case:** Portfolio displays, LP dashboard

### **Convenience Functions (For Direct Wallet Calls)**

#### 7. `getMyLoans()`
```solidity
function getMyLoans() external view returns (uint256[] memory)
```
- **Purpose:** Get current user's loans (uses msg.sender)
- **Use Case:** Direct wallet interactions

#### 8. `getMyActiveLoans()`
```solidity
function getMyActiveLoans() external view returns (
    uint256[] memory activeLoans, 
    uint256 count
)
```
- **Purpose:** Get current user's active loans
- **Use Case:** Direct wallet interactions

#### 9. `getMyLPBalance()`
```solidity
function getMyLPBalance() external view returns (uint256 shares, uint256 value)
```
- **Purpose:** Get current user's LP balance
- **Use Case:** Direct wallet interactions

#### 10. `doIHaveActiveLoan()`
```solidity
function doIHaveActiveLoan() external view returns (bool)
```
- **Purpose:** Check if current user has active loans
- **Use Case:** Direct wallet interactions

## 🔄 **Updated Contract ABI**

### **New ABI Entries to Add:**
```json
[
  "function repayLoan(uint256) external payable",
  "function getUserLoans(address) external view returns (uint256[])",
  "function getLoanDetails(uint256) external view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool)",
  "function getActiveLoansForUser(address) external view returns (uint256[],uint256)",
  "function getRepayAmount(uint256) external view returns (uint256)",
  "function hasActiveLoan(address) external view returns (bool)",
  "function getUserLPBalance(address) external view returns (uint256,uint256)",
  "function getMyLoans() external view returns (uint256[])",
  "function getMyActiveLoans() external view returns (uint256[],uint256)",
  "function getMyLPBalance() external view returns (uint256,uint256)",
  "function doIHaveActiveLoan() external view returns (bool)"
]
```

### **Remove These Old ABI Entries:**
```json
[
  "function repayLoan() external payable",
  "function getRepayAmount() external view returns (uint256)",
  "function hasActiveLoan() external view returns (bool)",
  "function getLoanInfo() external view returns (uint256,uint256,uint256,bool)"
]
```

## 💻 **Frontend Integration Examples**

### **1. Loading User Data**
```typescript
// Get all user loans
const userLoans = await contract.getUserLoans(userAddress);

// Get active loans only
const [activeLoans, activeCount] = await contract.getActiveLoansForUser(userAddress);

// Check if user has any loans
const hasLoans = await contract.hasActiveLoan(userAddress);
```

### **2. Displaying Loan Information**
```typescript
// Get complete loan details
const loanDetails = await contract.getLoanDetails(loanId);
const [
  borrower,
  borrowedETH,
  preAuthAmountUSD,
  currentInterest,
  totalRepayAmount,
  createdAt,
  preAuthExpiry,
  isActive,
  isExpired
] = loanDetails;

// Format for display
const loanInfo = {
  borrower,
  principal: ethers.utils.formatEther(borrowedETH),
  preAuthUSD: preAuthAmountUSD.toString(),
  interest: ethers.utils.formatEther(currentInterest),
  totalToRepay: ethers.utils.formatEther(totalRepayAmount),
  createdAt: new Date(createdAt.toNumber() * 1000),
  expiryDate: new Date(preAuthExpiry.toNumber() * 1000),
  isActive,
  isExpired
};
```

### **3. Repaying a Loan**
```typescript
// Get exact repayment amount
const repayAmount = await contract.getRepayAmount(loanId);

// Repay the specific loan
const tx = await contract.repayLoan(loanId, {
  value: repayAmount
});

await tx.wait();
```

### **4. LP Balance Display**
```typescript
// Get user's LP position
const [shares, value] = await contract.getUserLPBalance(userAddress);

const lpInfo = {
  shares: ethers.utils.formatEther(shares),
  ethValue: ethers.utils.formatEther(value)
};
```

### **5. Pool Statistics**
```typescript
// Get pool stats (unchanged)
const [totalLiq, totalBorr, available, utilization] = await contract.getPoolStats();

const poolStats = {
  totalLiquidity: ethers.utils.formatEther(totalLiq),
  totalBorrowed: ethers.utils.formatEther(totalBorr),
  availableLiquidity: ethers.utils.formatEther(available),
  utilizationPercent: (utilization.toNumber() / 100).toString() // Convert from basis points
};
```

## 🔧 **Migration Steps for Frontend**

### **Step 1: Update Contract ABI**
- Remove old function signatures
- Add new function signatures (see ABI section above)

### **Step 2: Update Repayment Flow**
```typescript
// OLD CODE (WILL FAIL):
const repayAmount = await contract.getRepayAmount();
await contract.repayLoan({ value: repayAmount });

// NEW CODE:
const repayAmount = await contract.getRepayAmount(loanId);
await contract.repayLoan(loanId, { value: repayAmount });
```

### **Step 3: Update Data Fetching**
```typescript
// OLD CODE (LIMITED):
const hasLoan = await contract.hasActiveLoan();
const loanInfo = await contract.getLoanInfo();

// NEW CODE (COMPREHENSIVE):
const userLoans = await contract.getUserLoans(userAddress);
const [activeLoans, count] = await contract.getActiveLoansForUser(userAddress);

// For each active loan:
for (const loanId of activeLoans) {
  const loanDetails = await contract.getLoanDetails(loanId);
  // Process loan details...
}
```

### **Step 4: Update UI Components**
- Loan selection dropdowns/lists (multiple loans possible)
- Loan-specific action buttons
- Individual loan detail cards
- Repayment amount displays per loan

## ⚡ **Benefits of These Changes**

### **1. Fixed Transaction Failures**
- No more failed transactions due to ambiguous loan detection
- Specific targeting prevents incorrect operations
- Proper validation on all functions

### **2. Better User Experience**
- Users can manage multiple loans independently
- Clear loan identification and selection
- Accurate repayment amounts per loan

### **3. Enhanced Frontend Capabilities**
- Query any user's data (not just connected wallet)
- Comprehensive loan information in single calls
- Efficient data loading with specific functions

### **4. Developer-Friendly**
- Clear function naming and purposes
- Consistent return types
- Both specific and convenience functions available

## 🚨 **Important Notes**

1. **Loan ID Required**: All loan operations now require specific loan IDs
2. **Multiple Loans**: Users can have multiple active loans simultaneously
3. **Address Parameters**: Most view functions accept user addresses for flexibility
4. **Validation Added**: All functions include proper input validation
5. **Backward Compatibility**: Old function signatures are completely removed

## 📞 **Support**

If you encounter any issues during migration or need clarification on any functions, please refer to the updated INTEGRATION.md file or contact the smart contract development team.

---

**Last Updated:** December 2024  
**Contract Version:** Latest  
**Breaking Changes:** Yes - see sections above