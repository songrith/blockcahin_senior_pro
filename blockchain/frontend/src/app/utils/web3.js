import Web3 from 'web3';

let web3;

if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
  // Browser wallet detected
  window.ethereum.request({ method: "eth_requestAccounts" });
  web3 = new Web3(window.ethereum);
} else {
  // Fallback to local node (Ganache)
  const provider = new Web3.providers.HttpProvider("http://127.0.0.1:7545");
  web3 = new Web3(provider);
}

export default web3;
