const Mayor = artifacts.require("Mayor");
    
module.exports = function(deployer, network, accounts) {
    deployer.deploy(Mayor, accounts[0], accounts[1], 30);
};