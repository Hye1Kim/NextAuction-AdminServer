/* BR2K 없는 버전 */

/*config*/
const LOCAL_ACUTION_SERVER_PORT = 3002;



/* lib modules */
const jwt = require('./lib/validTime2Token');
global.atob = require("atob");
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");





/* server framework */
const express = require('express');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(fileUpload());
// app.buyerInfoDB = new Map();
// app.auctionInfoDB = new Map();





/********************************START*******************************************/

auctionMiddleware = require('./middleware/auction.middleware');
databaseMiddleware = require('./middleware/database.middleware');
authMiddleware = require('./middleware/auth.middleware');


/**
 * @req {
 *  did,
 *  keyID,
 *  auctionMetaSig,
 *  auctionMetaHash
 * }
 */
app.post('/transfer-auth', async (req, res) => {
  console.log('/transfer-auth', req.body);

  const isValidAuth = authMiddleware.checkDIDAuth(
    req.body.did,
    req.body.keyID,
    req.body.auctionMetaSig,
    req.body.auctionMetaHash
  )
  if (!isValidAuth) {
    res.send("The requestor's identity is not confirmed.");
    return
  }
  const adminSig = await authMiddleware.createSign(req.body.auctionMetaHash);

  const delegationInfo = authMiddleware.createDelegationInfo(
    req.body.auctionMetaHash,
    adminSig
  )
  res.send(delegationInfo)
});



/**
 * @req {
 *  auctionMeta.name,
 *  auctionMeta.timestamp,
 *  auctionMeta.minPrice,
 *  auctionMeta.nft,
 *  auctionMeta.desc,
 *  auctionMeta.contentCreator,
 *  auctionMeta.contentOwner,
 *  auctionMeta.owner,
 * }
 */
app.post('/start-auction', async (req, res) => { //replicate
  const auctionMeta = req.body.auctionMeta;
  console.log("/start auction");

  const isValid = await auctionMiddleware.checkValidDelegation(auctionMeta.nft);
  if (!isValid) {
    res.send("error: Not valid delegation Address");
    return;
  }

  const rlpTXResult = await auctionMiddleware.startAuction(auctionMeta);
  console.log(rlpTXResult)
  if (rlpTXResult != 'success') {
    res.send('error: auction has not been created. ');
    return
  }

  console.log(` [NFT:${auctionMeta.nft}]`, " register auction info in auction contract..");
  setTimeout(async () => {
    const auctionID = await auctionMiddleware.getAuctionID(auctionMeta.nft);
    if (auctionID == -1) {
      res.send('error: failed to get auction id');
      return;
    }

    const token = await jwt.genJWT('60000ms', auctionMeta);
    if (!token) {
      res.send(token);
      return;
    }

    const result = await databaseMiddleware.createAuction(auctionID, auctionMeta, token);
    if (result.status == -1) {
      res.send("failed: \n" + result.err);
      return;
    }

    const auctionInfo = await databaseMiddleware.getAuctionInfo(auctionID)
    // auctionMiddleware.startMonitoring(auctionID, auctionInfo, jwt)


    console.log(` [NFT:${auctionMeta.nft}]`, " successful start auction");
    res.send("start auction: success");
  }, 5000);
});


/**
 * @req {
 *  aucID, reqAddr, senderRawTransaction
 * }
 */
app.post('/cancel-auction', async (req, res) => { //replicate
  console.log(
    '/cancel-auction ',
    `sender: ${req.body.reqAddr}`,
    `auctionID: ${req.body.aucID}`);

  const auctionID = req.body.aucID;
  const seller = req.body.reqAddr;
  const sellerRawTX = req.body.senderRawTransaction;

  if (await auctionMiddleware.isExistingBid(auctionID)) {
    res.send('error: There is a existing Bid');
    return;
  }
  if (!await auctionMiddleware.isContentOwner(seller, auctionID)) {
    res.send('error: Only owner can cancel');
    return;
  }

  const rlpTXResult = await auctionMiddleware.cancelAuction(sellerRawTX);
  if (rlpTXResult != 'success') {
    res.send('failed to cancel auction..');
    return
  }

  const result = await databaseMiddleware.endAuction(auctionID);
  if (result.status == -1) res.send('error: No value was updated into the database....\n' + result.err);
  else res.send("cancel success");

});



/**
 * @req {
 *  senderRawTransaction, aucID, userAddr
 *  userDID, keyID, contentSig, 
 *  contentMeta, amount
 * }
 */
app.post('/inprocess-auction', async (req, res) => {
  console.log('/inprocess-auction', 'buyer: ' + req.body.userAddr);
  const rawTx = req.body.senderRawTransaction; //rlp로 인코딩된 트랜잭션
  const auctionID = req.body.aucID;
  const buyerAddr = req.body.userAddr;
  const buyerDID = req.body.userDID;
  const buyerKeyID = req.body.keyID;
  const buyerSig = req.body.contentSig;
  const buyerSigData = JSON.stringify(req.body.contentMeta);
  const nft = req.body.contentMeta[0];
  const amount = req.body.amount;


  const auction = await databaseMiddleware.getAuctionInfo(auctionID);
  if (auction == -1) {
    res.send(`The auction ${auctionID} could not be found`);
    return;
  }

  const isValidAuth = await authMiddleware.checkDIDAuth(
    buyerDID,
    buyerKeyID,
    buyerSig,
    buyerSigData
  );
  if (!isValidAuth) {
    res.send("The requestor's identity is not confirmed.");
    return
  }

  if (auctionMiddleware.isEqualSeller(auction, buyerAddr)) {
    res.send("error: AUC Owner cannot bidding.");
    return;
  }

  /**
   * @test_ignore
   */
  // const isNotExpired = await jwt.verifyJWT(auction.valid_time, auction.valid_key);
  // if (!isNotExpired) {
  //   res.send("error: Timeout for bidding.");
  //   return;
  // }

  const curBuyer = await databaseMiddleware.getCurrentBuyer(nft);
  if (curBuyer == -1) {
    res.send(`Error: The buyers of ${nft} could not be found`);
    return;
  }

  const updated = await databaseMiddleware.updateBuyer(
    nft,
    buyerAddr,
    buyerDID,
    buyerKeyID,
    buyerSig,
    buyerSigData,
    amount,
    curBuyer.isExist
  )
  if (updated.status == -1) {
    res.send('error: update buyer in DB');
    return;
  }
  console.log(`updated to bidding: ${buyerAddr}`)

  const rlpTXResult = await auctionMiddleware.bidding(rawTx);
  if (rlpTXResult != 'success') res.send('failed to bidding..');
  else res.send('success: The bid was successful...');
})

/**
 * @req {
 *  auctionID, nft
 * }
 */
app.post('/end-auction', async (req, res) => {
  console.log('/end-auciton', `nft: ${req.body.nft}`);

  const nft = req.body.nft;
  const auctionID = req.body.auctionID;

  /**
   * @test_ignore
   */
  // if (!await auctionMiddleware.isAuctionEnd(auctionID)) {
  //   res.send('auction is not finished');
  //   return;
  // }

  const buyerInfo = await databaseMiddleware.getCurrentBuyer(nft);
  if (buyerInfo == -1) {
    res.send(`Not existing buyer in auction[${auctionID}]`);
    return;
  }

  const rlpTXResult = await auctionMiddleware.sendLastBidding(auctionID)
  if (rlpTXResult != 'success') {
    res.send('failed to last bidding..');
    return
  }

  const oldOwnerCert = await auctionMiddleware.getOldOwnerCert(nft);
  if (oldOwnerCert == -1) {
    res.send('Failed to get old ownershipcert..');
    return
  }

  await auctionMiddleware.askNewOwnershipCert(auctionID, buyerInfo.buyers[0], oldOwnerCert);

  const result = await databaseMiddleware.endAuction(auctionID);
  if (result.status == -1) res.send('error: No value was updated into the database....\n' + result.err);
  else res.send("end success");
})




/**
 * @req {
 *  ownershipCert, auctionID
 * }
 */
app.post('/transfer-ownership', async (req, res) => {
  console.log('/transfer-Ownership')
  const newOwnerCert = req.body.ownershipCert;
  const auctionID = req.body.auctionID;

  const buyerInfo = await databaseMiddleware.getCurrentBuyer(newOwnerCert.NFT + "");

  const rlpTXResult_change = await auctionMiddleware.changeOwnerCert(newOwnerCert, buyerInfo.buyers[0].user_addr);
  if (rlpTXResult_change != 'success') {
    res.send('failed to change cert..');
    return
  }

  const rlpTXResult_done = await auctionMiddleware.doneAuction(auctionID);
  if (rlpTXResult_done != 'success') {
    res.send('failed to done auction in auction management..');
    return
  }

  await auctionMiddleware.requestDoneAuction(auctionID);
  console.log(
    `[auction:${auctionID}-transfer ownership]`,
    `[nft-${newOwnerCert.NFT}, new owner buyer]:${buyerInfo.buyers[0].user_addr}`);
});


/**
 * auctionID
 */
app.post('done-auction', async (req, res) => {
  console.log('done-auction', req.body.auctionID);

  //fix why? duplicate? -> transfer-ownership
  const rlpTXResult_done = await auctionMiddleware.doneAuction(auctionID);
  if (rlpTXResult_done != 'success') {
    res.send('failed to done auction in auction management..');
    return
  }

  await auctionMiddleware.printAuctionEnd(auctionID);
  res.send(`${auctionID}: auction done!`);
})



app.listen(LOCAL_ACUTION_SERVER_PORT, () => {
  console.log(`auction-server is running on `, LOCAL_ACUTION_SERVER_PORT);
});


