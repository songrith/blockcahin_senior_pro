// migrations/2_deploy_landregistry.js

const LandRegistryPoC = artifacts.require("LandRegistryPoc");

module.exports = async function (deployer, network, accounts) {
  // 1️⃣ Deploy the contract (accounts[0] will be admin)
  await deployer.deploy(LandRegistryPoC);
  const instance = await LandRegistryPoC.deployed();

  // 2️⃣ Assign officer roles to accounts[1] & accounts[2]
  await instance.addOfficer(accounts[1], { from: accounts[0] });
  await instance.addOfficer(accounts[2], { from: accounts[0] });

  // 3️⃣ Assign submitter role to every other account
  for (let i = 0; i < accounts.length; i++) {
    // Skip admin (0) and officers (1,2)
    if (i === 0 || i === 1 || i === 2) continue;
    await instance.addSubmitter(accounts[i], { from: accounts[0] });
  }

  // 4️⃣ (Optional) Change required approvals threshold
  // await instance.setRequiredApprovals(3, { from: accounts[0] });
};
