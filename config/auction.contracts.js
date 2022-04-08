const fs = require('fs');
const BASE_ADDRESS_URL = __dirname+'/../res/auction/address/'
const BASE_ABI_URL = __dirname+'/../res/auction/abi/'


module.exports = {
    DEPLOYED_ADDRESS_CONTENT: fs.readFileSync(`${BASE_ADDRESS_URL}content-management`, 'utf8').replace(/\n|\r/g, ""),
    DEPLOYED_ABI_CONTENT: JSON.parse(fs.existsSync(`${BASE_ABI_URL}content-management`) && fs.readFileSync(`${BASE_ABI_URL}content-management`, 'utf8')),
    DEPLOYED_ADDRESS_NFT: fs.readFileSync(`${BASE_ADDRESS_URL}nft-management`, 'utf8').replace(/\n|\r/g, ""),
    DEPLOYED_ABI_NFT: JSON.parse(fs.existsSync(`${BASE_ABI_URL}nft-management`) && fs.readFileSync(`${BASE_ABI_URL}nft-management`, 'utf8')) ,
    DEPLOYED_ADDRESS_AUCTION:fs.readFileSync(`${BASE_ADDRESS_URL}auction-management`, 'utf8').replace(/\n|\r/g, ""),
    DEPLOYED_ABI_AUCTION: JSON.parse(fs.existsSync(`${BASE_ABI_URL}auction-management`) && fs.readFileSync(`${BASE_ABI_URL}auction-management`, 'utf8'))
}