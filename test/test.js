const { expect } = require("chai");

describe('TokenPaymentSplitter Tests', () => {
    let deployer
    let account1
    let account2
    let account3
    let account4
    let testPaymentToken
    let mockPool

    beforeEach(async () => {
        [deployer, account1, account2, account3, account4] = await ethers.getSigners()
        const TestPaymentToken = await ethers.getContractFactory('ERC20PresetMinterPauser')
        testPaymentToken = await TestPaymentToken.deploy('TestPaymentToken', 'TPT')
        await testPaymentToken.deployed()
    });

    describe('Add payees with varying amounts and distribute payments', () => {
        // 各ステークホルダーが任意のamountをclaimすると、balanceOfに反映される
        it('payment token is distributed evenly to multiple payees', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await mockPool
                .connect(account1)
                .claim(500)
            await mockPool
                .connect(account2)
                .claim(1000)
            await mockPool
                .connect(account3)
                .claim(1500)
            await mockPool
                .connect(account4)
                .claim(2000)
            const account1TokenBalance = await testPaymentToken.balanceOf(account1.address)
            const account2TokenBalance = await testPaymentToken.balanceOf(account2.address)
            const account3TokenBalance = await testPaymentToken.balanceOf(account3.address)
            const account4TokenBalance = await testPaymentToken.balanceOf(account4.address)
            expect(account1TokenBalance).to.equal(500)
            expect(account2TokenBalance).to.equal(1000)
            expect(account3TokenBalance).to.equal(1500)
            expect(account4TokenBalance).to.equal(2000)
        });

        // 同じ割合でトークン分配を行った場合、各アドレスに平等に分配がされているべき
        it('payment token is distributed unevenly to multiple payees', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            const account1TokenBalance = await mockPool.connect(account1.address).totalBalance()
            const account2TokenBalance = await mockPool.connect(account2.address).totalBalance()
            const account3TokenBalance = await mockPool.connect(account3.address).totalBalance()
            const account4TokenBalance = await mockPool.connect(account4.address).totalBalance()
            expect(account1TokenBalance).to.equal(25000)
            expect(account2TokenBalance).to.equal(25000)
            expect(account3TokenBalance).to.equal(25000)
            expect(account4TokenBalance).to.equal(25000)
        });

        // バラバラの割合でトークン分配を行った場合、各アドレスのtotalBalanceはそれぞれの分配率に沿う形である
        it('payment token is distributed unevenly to multiple payees', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [30, 20, 10, 40]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            const account1TokenBalance = await mockPool.connect(account1.address).totalBalance()
            const account2TokenBalance = await mockPool.connect(account2.address).totalBalance()
            const account3TokenBalance = await mockPool.connect(account3.address).totalBalance()
            const account4TokenBalance = await mockPool.connect(account4.address).totalBalance()
            expect(account1TokenBalance).to.equal(30000)
            expect(account2TokenBalance).to.equal(20000)
            expect(account3TokenBalance).to.equal(10000)
            expect(account4TokenBalance).to.equal(40000)
        });

        // アドレス指定されていないアドレスがclaimできてはいけない
        it('should fail if claiming address is not the one specified by the contract', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address]
            payeeShareArray = [10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await expect (
              mockPool
                .connect(account4)
                .claim(1000)
            ) 
                .to
                .be
                .revertedWith('TokenPaymentSplitter: account has no shares');
        });

        // 自分に割り当てられている以上のamountをclaimできてはいけない
        it('should fail if claiming amount is larger than its distributed pool', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await expect (
              mockPool
                .connect(account1)
                .claim(30000)
            )
                .to
                .be
                .revertedWith('More than total assets');
        });

        // transfer関数をowner権限で実行できる
        it('owner address can execute transfer function', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await mockPool
                .connect(deployer)
                .transfer(account1.address, 100000)
            const account1TokenBalance = await testPaymentToken.balanceOf(account1.address)
            expect(account1TokenBalance).to.equal(100000)
        });

        // deposit contractのowner以外のアドレスがtransfer関数を実行できてはいけない
        it('should fail if an address other than owner is attempting to execute transfer function', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await expect (
                mockPool
                  .connect(account1.address)
                  .transfer(account2.address, 100000)
              )
              .to.be.reverted;
        });

        // claimをしたらclaimableAmountとtotalBalance及びDepostContractのトークン保有量から同量が引かれている
        it('after claim execution it should reflect to the remained balance', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await mockPool
                .connect(account1)
                .claim(5000)
            const account1ClaimableAmount = await mockPool.connect(account1).claimableAmount()
            const account1TotalBalance = await mockPool.connect(account1).totalBalance()
            const DepositContractBalance = await testPaymentToken.balanceOf(mockPool.address)
            expect(account1ClaimableAmount).to.equal(20000)
            expect(account1TotalBalance).to.equal(20000)
            expect(DepositContractBalance).to.equal(95000)
        });

        // ロックアップ期間が解除されたと同時に、1日ごとにclaimableAmountが増え、claimableAmountをclaimすることが可能となる
        it('claimableAmount should increase after the lockup period ends', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662951600"
            vestingMonth = 3
            currentTime = "1663038000"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            const account1ClaimableAmount = await mockPool.connect(account1).claimableAmount()
            expect(account1ClaimableAmount).to.equal(274)
        });

        // claimableAmountが、ロックアップ/ベスティングを加味した正しい数字が表示されている
        it('claimableAmount should be based on vesting schedule', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 36
            currentTime = "1726035600"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            const account1ClaimableAmount = await mockPool.connect(account1).claimableAmount()
            expect(account1ClaimableAmount).to.equal(16082)
        });

        // claim可能なトークン量よりも大きいamountを引き出そうとしたらエラーとなる
        it('should fail if claim amount is larger than claimableAmount', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662951600"
            vestingMonth = 3
            currentTime = "1663038000"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await expect (
                mockPool
                  .connect(account1)
                  .claim(300)
              )
                  .to
                  .be
                  .revertedWith('More than claimable amount');
        });

        // 指定したトークン以外のトークン が送られた場合、それらを引き出すことはできない（= 指定したトークンのみに対応するDepositContractである）
        it('should fail if claim amount is larger than claimableAmount', async () => {
            const TestPaymentToken2 = await ethers.getContractFactory('ERC20PresetMinterPauser')
            testPaymentToken2 = await TestPaymentToken2.deploy('TestPaymentToken2', 'TPT2')
            await testPaymentToken2.deployed()
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken2.mint(mockPool.address, 100000)
            const account1TotalBalance = await mockPool.connect(account1).totalBalance()
            expect(account1TotalBalance).to.equal(0)
            await expect (
                mockPool
                  .connect(account1)
                  .claim(1000)
              )
                  .to
                  .be
                  .revertedWith('More than total assets');
        });

        // 一度デプロイされた後にinitializeを再度実行することはできない
        it('should fail if initialize function is called after deployed', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 2
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await expect (
                mockPool
                  .connect(deployer)
                  .initialize(payeeAddressArray, payeeShareArray,
                    testPaymentToken.address, releaseTime, vestingMonth, currentTime)
              )
                  .to
                  .be
                  .revertedWith('Initializable: contract is already initialized');
        });

        // renounceOwnershipを実行しても、owner権限は残る
        it('onlyOwner should remain even after executing renounceOwnership', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 6
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await mockPool.connect(deployer).renounceOwnership()
            await expect (
                mockPool
                  .connect(account1)
                  .transfer(account2.address, 100000)
              )
                  .to
                  .be
                  .revertedWith('Ownable: caller is not the owner');
            await mockPool
            .connect(deployer)
            .transfer(account1.address, 100000)
            const account1TokenBalance = await testPaymentToken.balanceOf(account1.address)
            expect(account1TokenBalance).to.equal(100000)
        });

        // ロックアップ期間中にclaimをすることはできない
        it('should fail if caller attempts to claim during the lockup period', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1670814000"
            vestingMonth = 3
            currentTime = "1665543600"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            await expect (
                mockPool
                    .connect(account1)
                    .claim(500)
               )
                    .to
                    .be
                    .revertedWith('Still in lock-up period');
            await expect (
                mockPool
                    .connect(account1)
                    .claimableAmount()
                )
                    .to
                    .be
                    .revertedWith('Still in lock-up period');
        });

        // vesting期間が過ぎたら、claimableAmountはそれ以上増加しない
        it('should fail if caller attempts to claim during the lockup period', async () => {
            payeeAddressArray = [account1.address, account2.address, account3.address, account4.address]
            payeeShareArray = [10, 10, 10, 10]
            releaseTime = "1662798631"
            vestingMonth = 1
            currentTime = "1670730607"
            const MockPool = await ethers.getContractFactory('MockPool')
            const mockPool = await upgrades.deployProxy(MockPool, [payeeAddressArray, payeeShareArray,
                testPaymentToken.address, releaseTime, vestingMonth, currentTime
            ], {
                initializer: "initialize",
            });
            await mockPool.deployed()
            await testPaymentToken.mint(mockPool.address, 100000)
            const account1ClaimableAmount = await mockPool.connect(account1.address).claimableAmount()
            const account1TotalBalance = await mockPool.connect(account1.address).totalBalance()
            expect(account1ClaimableAmount).to.equal(account1TotalBalance)
        });
    });
});