// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

contract MyContract {
    uint public value;
    event click();
    constructor() {
        value = 42;
    }
    function pressClick() public {
        emit click();
    }
}