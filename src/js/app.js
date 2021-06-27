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
        // Get current account
        web3.eth.getCoinbase(function(err, account) {

            if(err == null) {
                App.account = account;
                console.log("address:" + account)
                $("#user_address").text(account);

                
                
            }
        });

        // Load content's abstractions
        $.getJSON("Mayor.json").done(function(c) {
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
                //instance.click().on('data', function (event) {
                //    $("#eventId").html("Event catched!");
                //    console.log("Event catched");
                //    console.log(event);
                    // If event has parameters: event.returnValues.valueName
                //});
            // });
        });

        return App.render();
    },

    // Get a value from the smart contract
    render: function() {

        App.contracts["Contract"].deployed().then(async(instance) =>{

            const v = await instance.escrow(); // Solidity uint are Js BigNumbers 
            let voting_condition = await instance.voting_condition();
            console.log(voting_condition);
            let quorum = voting_condition.quorum.words[0];
            let envelopes_opened = voting_condition.envelopes_opened.words[0];
            let envelopes_casted = voting_condition.envelopes_casted.words[0];
            let envelopes_opened_perc = Math.floor(envelopes_opened * 100 / quorum);

            if (envelopes_casted < quorum){
                $('#open_envelope_button').addClass("disabled")
                $("#open_envelope_button").css("pointer-events", "none");
            }

            $("#quorum").text(quorum);
            $("#progress_bar_opened_envelopes").css("width", envelopes_opened_perc);
            
            $("#progress_bar_opened_envelopes_text").text(envelopes_opened_perc + "%");
            
            $("#progress_bar_opened_envelopes").attr("aria-valuenow", envelopes_opened_perc);
            console.log(envelopes_opened);
            
        });
    },

    // Call a function from a smart contract
        // The function send an event that triggers a transaction:: Metamask opens to confirm the transaction by the user
    candidate: function() {

        return new Promise((resolve, reject) => {
            App.contracts["Contract"].deployed().then((instance) =>{
                instance.new_candidate({from: App.account, value: parseInt($('#swal_candidate_deposit').val()) * 1000000000000000000}).then((receipt) =>  {
                    resolve(receipt);
                    console.log(receipt);
                }).catch((error, receipt) => {
                    reject(error.message);
                });
            })
        })
        
    },
    castEnvelope: function() {

        return new Promise((resolve, reject) => {
            let envelope = null;

            //call the compute envelope funtion
            App.contracts["Contract"].deployed().then((instance) =>{
                instance.compute_envelope($('#swal_castenvelope_sigil').val(), $('#swal_castenvelope_candidate_address').val(), $('#swal_castenvelope_souls').val(), {from: App.account}).then((receipt) =>  {
                    envelope = receipt;
                    //call the cast envelope function
                    instance.cast_envelope(envelope, {from: App.account}).then((receipt) =>  {
                        resolve(receipt)
                    }).catch((error, receipt) => {
                        reject(error.message);
                    });
                })

                }).catch((error, receipt) => {
                    reject(error.message);
                });

                App.contracts["Contract"].deployed().then((instance) =>{
                
            })
        })
        
    },
    openEnvelope: function() {

        return new Promise((resolve, reject) => {
            App.contracts["Contract"].deployed().then((instance) =>{
                instance.open_envelope($('#swal_openenvelope_sigil').val(), $('#swal_openenvelope_candidate').val(), {from: App.account, value: parseInt($('#swal_openenvelope_souls').val()) * 1000000000000000000}).then((receipt) =>  {
                    resolve(receipt);
                    console.log(receipt);
                }).catch((error, receipt) => {
                    reject(error.message);
                });
            })
        })
        
    },
}

// Call init whenever the window loads
$(window).on('load', function () {

    App.init();
});