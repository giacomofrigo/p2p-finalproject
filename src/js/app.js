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

            web3.eth.getBlockNumber(function (error, block) {
                // mayor is the Solidity event
                instance.NewMayor().on('data', function (event) {
                    console.log("Event catched");
                    console.log((event));
                    //$('#winner_address').text(events.args.candidate)
                });

            });
        });

        return App.render();
    },

    // Get a value from the smart contract
    render: function() {

        App.contracts["Contract"].deployed().then(async(instance) =>{

            const v = await instance.escrow(); // Solidity uint are Js BigNumbers 
            let voting_condition = await instance.voting_condition();
            let quorum = voting_condition.quorum.words[0];
            let envelopes_opened = voting_condition.envelopes_opened.words[0];
            let envelopes_casted = voting_condition.envelopes_casted.words[0];
            let envelopes_opened_perc = Math.floor(envelopes_opened * 100 / quorum);
            
                        

            console.log("Casted envelopes: "+ envelopes_casted, ", Opened: "+ envelopes_opened, " Ended? " + voting_condition.ended)
            if (voting_condition.ended){
                let winner = await instance.winner()

                if (winner == '0x0000000000000000000000000000000000000000'){
                    $('#defaultView').hide()
                    $('#casted_buttons').hide()
                    $('#opened_envelopes').hide()
                    $('#opened_sentence').hide()
                    $('#mayor_or_sayonara_view').hide()
                    $('#mayor_or_sayonara_view').hide()
                    $('#tie_view').fadeIn()
                    $('#result_view').hide()
                    
                }else{
                    $('#defaultView').hide()
                    $('#casted_buttons').hide()
                    $('#opened_envelopes').hide()
                    $('#opened_sentence').hide()
                    $('#mayor_or_sayonara_view').hide()
                    $('#mayor_or_sayonara_view').hide()
                    $('#result_view').fadeIn()
                    $('#winner_address').text(winner)
                    $('#resultTableDiv').show();
                }
                
            }else{

                if (envelopes_casted < quorum){
                    $('#open_envelope_button').addClass("disabled")
                    $("#open_envelope_button").css("pointer-events", "none");
                }else{
                    $('#cast_envelope_button').addClass("disabled")
                    $("#cast_envelope_button").css("pointer-events", "none");
                    $('#recast_envelope_button').addClass("disabled")
                    $("#recast_envelope_button").css("pointer-events", "none");
                }
    
                if (envelopes_opened == quorum){
                    $('#defaultView').hide()
                    $('#casted_buttons').hide()
                    $('#opened_envelopes').hide()
                    $('#opened_sentence').hide()
                    $('#mayor_or_sayonara_view').show()
                    $('#mayor_or_sayonara_view').show()
                }

            }
            
            $("#quorum").text(quorum);
            $("#progress_bar_opened_envelopes").css("width", envelopes_opened_perc + "%");
            
            $("#progress_bar_opened_envelopes_text").text(envelopes_opened_perc + "%");
            
            $("#progress_bar_opened_envelopes").attr("aria-valuenow", envelopes_opened_perc);
            
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
                instance.compute_envelope($('#swal_castenvelope_sigil').val(), $('#swal_castenvelope_candidate_address').val(),  web3.utils.toWei($('#swal_castenvelope_souls').val(), "ether"), {from: App.account}).then((receipt) =>  {
                    envelope = receipt;
                    console.log(receipt)
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
                instance.open_envelope($('#swal_openenvelope_sigil').val(), $('#swal_openenvelope_candidate').val(), {from: App.account, value: web3.utils.toWei($('#swal_openenvelope_souls').val(), "ether")}).then((receipt) =>  {
                    resolve(receipt);
                }).catch((error, receipt) => {
                    if (error.message.length > 500)
                        reject(error.message.split("message")[1].split('"')[2]);
                    reject(error.message);
                });
                
            })
        })
        
    },

    mayorOrSayonara: function() {

        return new Promise((resolve, reject) => {
            App.contracts["Contract"].deployed().then((instance) =>{
                instance.mayor_or_sayonara({from: App.account}).then((receipt) =>  {
                    resolve(receipt);
                }).catch((error, receipt) => {
                    if (error.message.length > 500)
                        reject(error.message.split("message")[1].split('"')[2]);
                    reject(error.message);
                });
                
            })
        })
        
    },

    getCandidateLength: function() {
        App.contracts["Contract"].deployed().then((instance) =>{
            instance.getCandidatesCount({from: App.account}).then((receipt) =>  {
                return receipt;
            }).catch((error, receipt) => {
                console.log(error)
            });
            
        })
    
    },

    getCandidate: function(index) {
        App.contracts["Contract"].deployed().then((instance) =>{
            instance.getCandidate(index, {from: App.account}).then((receipt) =>  {
                return receipt;
            }).catch((error, receipt) => {
                console.log(error)
            });
            
        })
    
    },
    getCandidateStruct: function(address) {
        App.contracts["Contract"].deployed().then((instance) =>{
            instance.getCandidateStruct(address, {from: App.account}).then((receipt) =>  {
                return receipt;
            }).catch((error, receipt) => {
                console.log(error)
            });
            
        })
    
    },
}

// Call init whenever the window loads
$(window).on('load', function () {

    App.init();
});