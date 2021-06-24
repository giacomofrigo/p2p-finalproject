App = {

    contracts: {},
    web3Provider: null,             // Web3 provider
    url: 'http://127.0.0.1:7545',   // Url for web3
    account: '0x0',                 // current ethereum account

    init: function() {

        return App.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
        
        // console.log(web3);
        
        if(typeof web3 != 'undefined') {
//            App.web3Provider = web3.currentProvider;
//            web3 = new Web3(web3.currentProvider);
            App.web3Provider = window.ethereum; // !! new standard for modern eth browsers (2/11/18)
            web3 = new Web3(App.web3Provider);
            try {
                    ethereum.enable().then(async() => {
                        console.log("DApp connected to Metamask");
                    });
            }
            catch(error) {
                console.log(error);
            }
        } else {
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
            web3 = new Web3(App.web3Provider);
        }

        return App.initContract();
    },

    /* Upload the contract's abstractions */
    initContract: function() {
        console.log("init")
        // Get current account
        web3.eth.getCoinbase(function(err, account) {

            if(err == null) {
                App.account = account;
                console.log("address:" + account)
                $("#user_address").text(account);
            }
        });

        // Load content's abstractions
        $.getJSON("MyContract.json").done(function(c) {
            App.contracts["Contract"] = TruffleContract(c);
            App.contracts["Contract"].setProvider(App.web3Provider);

            return App.listenForEvents();
        });
    },

    // Write an event listener
    listenForEvents: function() {

        App.contracts["Contract"].deployed().then(async (instance) => {

            // web3.eth.getBlockNumber(function (error, block) {
                // click is the Solidity event
                instance.click().on('data', function (event) {
                    $("#eventId").html("Event catched!");
                    console.log("Event catched");
                    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                });
            // });
        });

        return App.render();
    },

    // Get a value from the smart contract
    render: function() {

        App.contracts["Contract"].deployed().then(async(instance) =>{

            const v = await instance.value(); // Solidity uint are Js BigNumbers 
            console.log(v.toNumber());
        });
    },

    // Call a function from a smart contract
        // The function send an event that triggers a transaction:: Metamask opens to confirm the transaction by the user
    pressClick: function() {

        App.contracts["Contract"].deployed().then(async(instance) =>{

            await instance.pressClick({from: App.account});
        });
    } 
}

// Call init whenever the window loads
$(window).on('load', function () {

    App.init();
});