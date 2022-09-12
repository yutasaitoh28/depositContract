// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./TokenPaymentSplitter.sol";
contract MockPool is Initializable, OwnableUpgradeable, TokenPaymentSplitter {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    function initialize(address[] memory _payees, uint256[] memory _shares,
    address _paymentToken, uint256 _releaseTime, uint256 _vestingMonth, uint256 _currentTime) public initializer {
        __Ownable_init();
        // require(_releaseTime > block.timestamp);
        require(
            _payees.length == _shares.length,
            "TokenPaymentSplitter: payees and shares length mismatch"
        );
        require(_payees.length > 0, "TokenPaymentSplitter: no payees");
        for (uint256 i = 0; i < _payees.length; i++) {
            _addPayee(_payees[i], _shares[i]);
        }
        paymentToken = _paymentToken;
        releaseTime = _releaseTime;
        vestingMonth = _vestingMonth;
        //テスト用に現在の時間を指定する
        currentTime = _currentTime;
    }

    // renounceOwnership関数を以下で無効化する（onlyOnwer権限は常に必要なため）
    function renounceOwnership() public virtual onlyOwner override  {}

    // DepositContractにバグが見つかり、Owner権限により資産を他のコントラクトへ移行したい場合
    function transfer(address recipient, uint256 amount) external onlyOwner {
        IERC20Upgradeable(paymentToken).safeTransfer(recipient, amount);
    }
}