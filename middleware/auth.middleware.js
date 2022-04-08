const DID = require('../config/did.config')
const AUCTION = require('../config/auction.account');
const logger = require('../lib/winston');

/* did-auth client */
const KlayDIDClient = require('klay-did-auth');
const klayDID = new KlayDIDClient({
  network: DID.NETWORK,
  regABI: DID.REG_ABI,
  regAddr: DID.ADDRESS
});


//       // const authResults = await klayDID.didAuth(did, keyID, signature, signData);

async function checkDIDAuth(did, keyID, signature, signData) {
  const authResults = await klayDID.didAuth(did, keyID, signature, signData);
  const isValid = authResults[0];
  return isValid;
}

async function createAdminSign(auctionMetaHash) {
  const adminSignature = await klayDID.sign(
    auctionMetaHash,
    "EcdsaSecp256k1RecoveryMethod2020",
    AUCTION.PRIVATE_KEY).signature;

  logger.info('Auction Service signed on the transfer of Auction authority. (adminAuctionSignature)', adminSignature);

  return adminSignature;
}

function createDelegationInfo(auctionMetaHash, adminSig) {
  return {
    "auctionMetaHash": auctionMetaHash,
    "adminAuctionSig": adminSig,
    "adminAuctionDID": AUCTION.SCV_DID,
    "adminAuctionAcc": AUCTION.ADDRESS
  }
}


module.exports = {
  checkDIDAuth,
  createAdminSign,
  createDelegationInfo
}