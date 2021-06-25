const Mayor = artifacts.require("Mayor");
    
module.exports = function(deployer, network, accounts) {
    deployer.deploy(Mayor, "0xd69c0c799f096eed827e5EEa1aA400BCac848BD9", 3);
};