import web3 from './web3';
import LandRegistryPoC from '../contracts/LandRegistryPoC.json';

const address = '0xdb75066e495fbAed8D930c868Acf65A9775f536d';
const instance = new web3.eth.Contract(LandRegistryPoC.abi, address);

export default instance;
