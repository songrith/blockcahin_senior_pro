import web3 from './web3';
import LandRegistryPoC from '../contracts/LandRegistryPoC.json';

const address = '0x7e2352d67E46A0D28da45a965515BD6e42B345aB';
const instance = new web3.eth.Contract(LandRegistryPoC.abi, address);

export default instance;
