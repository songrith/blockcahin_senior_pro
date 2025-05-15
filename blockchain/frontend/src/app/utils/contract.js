import web3 from './web3';
import LandRegistryPoC from '../contracts/LandRegistryPoC.json';

const address = '0xE9b4D66495279dCB38CD1a1A4d130BE2Ae5eBE8A';
const instance = new web3.eth.Contract(LandRegistryPoC.abi, address);

export default instance;
