// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

contract Mayor {
    
    // Structs, events, and modifiers
    
    // Store refund data
    struct Refund {
        uint soul;
        address payable candidate;
    }
    
    // Data to manage the confirmation
    struct Conditions {
        uint32 quorum;
        uint32 envelopes_casted;
        uint32 envelopes_opened;
        bool ended;
    }

    struct Candidate {
        uint deposit;
        uint n_votes;
        uint soul_votes;
    }
    
    event NewMayor(address _candidate);
    event Sayonara(address _escrow);
    event EnvelopeCast(address _voter);
    event EnvelopeOpen(address _voter, uint _soul, address _doblon);
    
    // Someone can vote as long as the quorum is not reached
    modifier canVote() {
        require(voting_condition.envelopes_casted < voting_condition.quorum, "Cannot vote now, voting quorum has been reached");
        require(candidates.length > 0, "No candidates registered!");
        _;   
    }
    
    // Envelopes can be opened only after receiving the quorum
    modifier canOpen() {
        require(voting_condition.envelopes_casted == voting_condition.quorum, "Cannot open an envelope, voting quorum not reached yet");
        _;
    }

    // Candidates can be added until the quorum has not reached yet.
    modifier canCandidate() {
        require(voting_condition.envelopes_casted < voting_condition.quorum, "Cannot insert new candidates, voting quorum has been reached");
        _;
    }
    
    // The outcome of the confirmation can be computed as soon as all the casted envelopes have been opened
    modifier canCheckOutcome() {
        require(voting_condition.envelopes_opened == voting_condition.quorum , "Cannot check the winner, need to open all the sent envelopes");
        //***********************************************
        require(voting_condition.ended == false , "Mayor or Sayonara has already been called");
        //***********************************************
        _;
    }
    
    // State attributes
    
    // Initialization variables
    address payable[] public candidates;
    address payable public escrow;

    //candidate deposit: souls eaach candidate deposit
    mapping(address => Candidate) public candidates_struct;
    
    // Voting phase variables
    mapping(address => bytes32) envelopes;

    Conditions public voting_condition;

    // maps each candidate address to the amount of soul sent to him from voters


    // Refund phase variables
    mapping(address => Refund) souls;
    address payable[] voters;

    address payable public winner;

    //***********************************************
    // the public keyword has been removed from the constructor
    // since it generates a warning message
    //***********************************************

    /// @notice The constructor only initializes internal variables
    /// @param _escrow (address) The address of the escrow account
    /// @param _quorum (address) The number of voters required to finalize the confirmation
    constructor(address payable _escrow, uint32 _quorum) {
        escrow = _escrow;
        voting_condition = Conditions({quorum: _quorum, envelopes_casted: 0, envelopes_opened: 0, ended: false});
    }


    // this function add a new candidate
    function new_candidate() canCandidate public payable{
        candidates.push(payable(msg.sender));
        candidates_struct[msg.sender].deposit = msg.value;
    }


    /// @notice Store a received voting envelope
    /// @param _envelope The envelope represented as the keccak256 hash of (sigil, doblon, soul) 
    function cast_envelope(bytes32 _envelope) canVote public {
        
        // 0x0 means that is the first envelope caste from this sender
        if(envelopes[msg.sender] == 0x0) // => NEW, update on 17/05/2021
            voting_condition.envelopes_casted++;

        envelopes[msg.sender] = _envelope;
        emit EnvelopeCast(msg.sender);
    }
    
    
    /// @notice Open an envelope and store the vote information
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _candidate (address) The voting preference
    /// @dev The soul is sent as crypto
    /// @dev Need to recompute the hash to validate the envelope previously casted
    function open_envelope(uint _sigil, address payable _candidate) canOpen public payable {

            // emit EnvelopeOpen() event at the end

        require(envelopes[msg.sender] != 0x0, "The sender has not casted any votes");
        // ******************************************************
        // check that the envelope has not opened yet
        require(souls[msg.sender].soul == 0x0, "The sender has already opened this envelope");
        // ****************************************************
        
        bytes32 _casted_envelope = envelopes[msg.sender];
        bytes32 _sent_envelope = 0x0;
        // ...
        // ***************************************************
        _sent_envelope = keccak256(abi.encode(_sigil, _candidate, msg.value));
        // ***************************************************

        require(_casted_envelope == _sent_envelope, "Sent envelope does not correspond to the one casted");

        // ...
        // ***************************************************
        
        // increment # of envelopes opened
        voting_condition.envelopes_opened++;

        // instantiate a refund
        Refund memory refund;
        refund.candidate = _candidate;
        refund.soul = msg.value;
        // set the refund in souls
        souls[msg.sender] = refund;
        voters.push(payable(msg.sender));

        // increment soul for the voted candidate
        if (candidates_struct[_candidate].soul_votes == 0x0){
            candidates_struct[_candidate].soul_votes = 0;
            candidates_struct[_candidate].n_votes = 0;
        }

        candidates_struct[_candidate].soul_votes += msg.value;
        candidates_struct[_candidate].n_votes += 1;
            
        //emit event
        emit EnvelopeOpen(msg.sender, msg.value, _candidate);

        // ***************************************************
    }
    
    
    /// @notice Either confirm or kick out the candidate. Refund the electors who voted for the losing outcome
    function mayor_or_sayonara() canCheckOutcome public {

        // TODO Complete this function
            
            // emit the NewMayor() event if the candidate is confirmed as mayor
            // emit the Sayonara() event if the candidate is NOT confirmed as mayor 

        // *****************************************************

        voting_condition.ended = true;
        
        uint max_souls = 0;
        uint n_candidates = candidates.length;
        uint n_voters = voters.length;
        bool tie = false;
        
        
        for (uint i=0; i<n_candidates; i++){

            // if this candidate has mor souls than the actual max_souls
            // new candidate winner 
            if (candidates_struct[candidates[i]].soul_votes > max_souls){
                max_souls = candidates_struct[candidates[i]].soul_votes;
                winner = candidates[i];

                //remove tie flag if set
                if (tie)
                    tie = false;
            }

            // in case the two candidate have the same ampount of souls, checks th n_votes
            else if (candidates_struct[candidates[i]].soul_votes == max_souls){
                
                // if the candidate winner has less n_votes than the candidates of this loop
                // new candidate winner
                if (candidates_struct[winner].n_votes < candidates_struct[candidates[i]].n_votes)
                    winner = candidates[i];
                    if (tie)
                        tie = false;
                
                //if they are equal the winner does not change but set a escrow_winner = true
                else if (candidates_struct[winner].n_votes == candidates_struct[candidates[i]].n_votes)
                    tie = true;
            }
        }


        // NO WINNER CASE
        if (tie){
            uint all_souls = 0;

            for (uint i=0; i<n_candidates; i++){
                all_souls += candidates_struct[candidates[i]].soul_votes;
                all_souls += candidates_struct[candidates[i]].deposit;
            }

            // send all soul to escrow
            escrow.transfer(all_souls);

            emit Sayonara(escrow);

            return;
        }
        
        // compute amount of soul to transfer to winner voters (taken from winner initial deposit)
        uint supporter_refund = candidates_struct[winner].deposit / candidates_struct[winner].n_votes;
 
        for (uint i=0; i<n_voters; i++){
            //REFUND LOSER
            if (souls[voters[i]].candidate != winner){
                voters[i].transfer(souls[voters[i]].soul);
            //REFUND SUPPORTER
            }else{
                voters[i].transfer(supporter_refund);
            }
        }

        // loser deposit is transfered to the winner
        uint loser_deposits = 0;
        for (uint i=0; i<n_candidates; i++){
            if(candidates[i] != winner)
                loser_deposits += candidates_struct[candidates[i]].deposit;
        }

        // transfer money to winner
        winner.transfer(candidates_struct[winner].soul_votes + loser_deposits);
        
        emit NewMayor(winner);

        // *****************************************************       
    }
 
 
    /// @notice Compute a voting envelope
    /// @param _sigil (uint) The secret sigil of a voter
    /// @param _candidate (address) The voting preference
    /// @param _soul (uint) The soul associated to the vote
    function compute_envelope(uint _sigil, address payable _candidate, uint _soul) public pure returns(bytes32) {
        return keccak256(abi.encode(_sigil, _candidate, _soul));
    }
    
    function who_have_more_votes(address payable addr1, address payable addr2) private view returns(bool, address payable){
        uint count_addr1 = 0;
        uint count_addr2 = 0;
        uint n_voters = voters.length;
        
        for (uint i=0; i<n_voters; i++){
            if (souls[voters[i]].candidate == addr1)
                count_addr1 ++;
            if (souls[voters[i]].candidate == addr2)
                count_addr2 ++;
            
        }
        
        if (addr1 > addr2)
            return (true, addr1);
        else if (addr2 > addr1)
            return (true, addr2);
        else
            return (false, addr1);
    }
    
}
