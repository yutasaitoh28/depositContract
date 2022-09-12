// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
abstract contract TokenPaymentSplitter {
    event PayeeAdded(address account, uint256 shares);
    event PaymentReleased(address to, uint256 amount);
    
    using SafeERC20Upgradeable for IERC20Upgradeable;
    address internal paymentToken;
    uint256 internal releaseTime;
    uint256 internal vestingMonth;
    uint256 internal currentTime;
    uint256 internal _totalShares;
    uint256 internal _totalTokenReleased;
    address[] internal _payees;
    mapping(address => uint256) internal _shares;
    mapping(address => uint256) internal _tokenReleased;
    
    // Claim可能なトークンバランスを確認したい場合
    function claimableAmount() public view returns (uint256) {
        address account = msg.sender;
        require(currentTime >= releaseTime, "Still in lock-up period");
        uint256 tokenTotalReceived = IERC20Upgradeable(paymentToken).balanceOf(address(this)) + _totalTokenReleased;
        uint256 totalAsset = (tokenTotalReceived * _shares[account]) / _totalShares;
        uint256 paymentDaily = totalAsset / (365 * vestingMonth / 12);
        uint256 vestingTotalDays = 365 * vestingMonth / 12;
        uint256 vestingDaysElapsed = (currentTime - releaseTime) / 60 / 60 / 24;
        uint256 claimable;
        if (vestingDaysElapsed > vestingTotalDays) {
            claimable =  totalAsset - _tokenReleased[account];
        } else {
            claimable = paymentDaily * vestingDaysElapsed - _tokenReleased[account];
        }
        return claimable;
    }

    // DepositContractから引き出し可能な総残高（Claim解放されていない分も含む）
    function totalBalance() public view returns (uint256) {
        address account = msg.sender;
        uint256 tokenTotalReceived = IERC20Upgradeable(paymentToken).balanceOf(address(this)) + _totalTokenReleased;
        uint256 totalAsset = (tokenTotalReceived * _shares[account]) / _totalShares - _tokenReleased[account];
        return totalAsset;
    }
    
    // 初期化の際に使用（引き出し可能なアドレスを指定する）
    function _addPayee(address account, uint256 shares_) internal {
        require(
            account != address(0),
            "TokenPaymentSplitter: account is the zero address"
        );
        require(shares_ > 0, "TokenPaymentSplitter: shares are 0");
        require(
            _shares[account] == 0,
            "TokenPaymentSplitter: account already has shares"
        );
        _payees.push(account);
        _shares[account] = shares_;
        _totalShares = _totalShares + shares_;
        emit PayeeAdded(account, shares_);
    }

    // Claimを実行する際に使用
    function claim(uint256 amount) public virtual {
        address account = msg.sender;
        require(currentTime >= releaseTime, "Still in lock-up period");
        require(
            _shares[account] > 0, "TokenPaymentSplitter: account has no shares"
        );
        uint256 tokenTotalReceived = IERC20Upgradeable(paymentToken).balanceOf(address(this)) + _totalTokenReleased;
        uint256 totalAsset = (tokenTotalReceived * _shares[account]) / _totalShares;
        require(totalAsset >= amount, "More than total assets");
        uint256 paymentDaily = totalAsset / (365 * vestingMonth / 12);
        uint256 vestingTotalDays = 365 * vestingMonth / 12;
        uint256 vestingDaysElapsed = (currentTime - releaseTime) / 60 / 60 / 24;
        uint256 claimable;
        if (vestingDaysElapsed > vestingTotalDays) {
            claimable =  totalAsset - _tokenReleased[account];
        } else {
            claimable = paymentDaily * vestingDaysElapsed - _tokenReleased[account];
        }
        require(claimable != 0, "TokenPaymentSplitter: account is not due payment");
        require(claimable >= amount, "More than claimable amount");
        _tokenReleased[account] = _tokenReleased[account] + amount;
        _totalTokenReleased = _totalTokenReleased + amount;
        IERC20Upgradeable(paymentToken).safeTransfer(account, amount);
        emit PaymentReleased(account, amount);
    }
}