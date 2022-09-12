const { ethers, upgrades } = require("hardhat");

async function main() {
    const MockPool = await ethers.getContractFactory("MockPool");
    const payees = ["0x9e3dD216E4A55231916B3969bCb53D613D68204C", "0x560eE6d31100944e1CA8310Ea10d18840bDD4297"];
    const shares = [50,50];
    const paymentToken = "0x7808d79CD2eBc8882a0070A975815A7338Fa8839";
    const releaseTime = "1662868207";
    const vestingMonth = 2;

    const mockpool = await upgrades.deployProxy(MockPool, [payees, shares,
        paymentToken, releaseTime, vestingMonth
    ], {
        initializer: "initialize",
    });

    console.log("MockPool deployed to:", mockpool.address);
}

main();