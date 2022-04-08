/* + BR2K 버전, 테스트 이걸로 했음 */

/*config*/
const LOCAL_ACUTION_SERVER_PORT = 3002;


/* lib modules */
const jwt = require('./lib/validTime2Token');
global.atob = require("atob");
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");


/*server framework*/
const RUNTIME_CONFIG = require('./config/runtime-config')
const app = require('br2k-was')(RUNTIME_CONFIG);

const fileUpload = require('express-fileupload');
const cors = require('cors');
app.use(cors());
app.use(fileUpload());

/********************************START*******************************************/
auctionMiddleware = require('./middleware/auction.middleware');
databaseMiddleware = require('./middleware/database.middleware');
authMiddleware = require('./middleware/auth.middleware');

/********************* TEST-LOG ********************************** */
const fs = require('fs')
const logFolder = './log-by-auction/'

function UpdateTestLog(nft, value){
  const cur = JSON.parse(fs.readFileSync(`${logFolder}${nft}.json`, 'utf-8'));
  cur.history.push(value)
  fs.writeFileSync(`${logFolder}${nft}.json`,JSON.stringify(cur,0,4,0));
}

function CreateTestLog(auctionMeta){
  fs.writeFileSync(`${logFolder}${auctionMeta.nft}.json`, JSON.stringify({
    'auciton-nft': auctionMeta.nft,
    'seller': auctionMeta.owner,
    'start-time': new Date(),
    'auciton-meta': auctionMeta,
    'history': [],
  },0,4,0))
}

app.onlyOnce('GET','/log', async(req, res) => {
  const auclog = require(`./log-by-auction/${req.body.nft}.json`);
  console.log(auclog);
  res.send(auclog);
})
/********************* TEST-LOG ********************************** */


app.onlyOnce('GET','/health', (req,res)=>{
  res.send('Its me'); //leader 
});

/**
 * @desc assign delegation
 * @req {did,keyID,auctionMetaSig,auctionMetaHash}
 */
app.onlyOnce('POST','/transfer-auth', async (req, res)=>{
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


app.replicate('POST', '/start-auction', async (req, res) => {
  const auctionMeta = req.body.auctionMeta;
  console.log("/start auction");

  const isValid = await auctionMiddleware.checkValidDelegation(auctionMeta.nft);
  if (!isValid) {
    res.send("error: Not valid delegation Address");
    return;
  }
    
  /*@only Leader@*/
  if (app.isLeader(req)) {
      const rlpTXResult = await auctionMiddleware.startAuction(auctionMeta);
      console.log('start auction fee delegation: '+rlpTXResult)
  }

  /*test-log*/
  CreateTestLog(auctionMeta)


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
    /*@only Leader@*/
    if (app.isLeader(req)) {
        //auctionMiddleware.startMonitoring(auctionID, auctionInfo, jwt) 
    }else{//?????
        //auctionMiddleware.-follow-startMonitoring(auctionID, auctionInfo, jwt) 
    }

    console.log(` [NFT:${auctionMeta.nft}]`, " successful start auction");
    res.send("start auction: success");
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$")
  }, 5000);
})





/**
 * @req {
 *  aucID, reqAddr, senderRawTransaction
 * }
 */
app.replicate('POST', '/cancel-auction', async (req, res) => { //replicate
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

  /*@only Leader@*/
  if (app.isLeader(req)) {
    const rlpTXResult = await auctionMiddleware.cancelAuction(sellerRawTX);
    console.log('cancel auction fee delegation: '+rlpTXResult)
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


app.replicate('POST','/inprocess-auction', async (req, res) => {
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

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][start: bidding, amount ${amount}]`)

  const auction = await databaseMiddleware.getAuctionInfo(auctionID);
  if (auction == -1) {
    res.send(`The auction ${auctionID} could not be found`);
    return;
  }

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][get auction info...]`)

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

  if (auctionMiddleware.isBiggerthanLast(auction, amount)){
    res.send("error: bidding price smaller than last bidding");
    return;
  }

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][buyer did-auth: success]`)


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

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][get current buyer in local db]`)


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


  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][update latest bidding in local db]`)
    
  let rlpTXResult = 'success'
  /*@only Leader@*/
  if (app.isLeader(req)) {
    rlpTXResult = await auctionMiddleware.bidding(rawTx);
    console.log('bidding fee delegation: '+rlpTXResult)
  }
  if(rlpTXResult) res.send('success: The bid was successful...')
  else res.send('failed to bidding..');

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][bidding operation in auction contract ]`)
  UpdateTestLog(nft, `[${auctionID}][Bidding][${buyerAddr}][bidding success-end ]`)
})

app.replicate('POST','/end-auction', async (req, res) => {
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

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][ENDAuction][${buyerInfo.buyers[0].user_addr}][get current buyer in local db]`)    

  /*@only Leader@*/
  if (app.isLeader(req)) {
    const rlpTXResult = await auctionMiddleware.sendLastBidding(auctionID)
    console.log('send last bidding fee delegation: '+rlpTXResult)
    if(rlpTXResult) res.send('success: sendLastBidding...')
    else res.send('failed to sendLastBidding...');
  }

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][ENDAuction][${buyerInfo.buyers[0].user_addr}][send last bid to seller]`)  

  let oldOwnerCert;
  /*@only Leader@*/
  if (app.isLeader(req)) {
    oldOwnerCert = await auctionMiddleware.getOldOwnerCert(nft);
    if (oldOwnerCert == -1) {
      res.send('Failed to get old ownershipcert..');
      return
    }
    await auctionMiddleware.askNewOwnershipCert(auctionID, buyerInfo.buyers[0], oldOwnerCert);
  }

  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][ENDAuction][${buyerInfo.buyers[0].user_addr}][get oldOwnerCert in contract]`)  
  /*test-log*/
  UpdateTestLog(nft, `[${auctionID}][ENDAuction][${oldOwnerCert.ownerInfo.did}][ownerAddress in oldOwnerCert]`)  

  const result = await databaseMiddleware.endAuction(auctionID);
  if (result.status == -1) {
    res.send('error: No value was updated into the database....\n' + result.err);
    return 
  }
  else res.send("end success");
   /*test-log*/
   UpdateTestLog(nft, `[${auctionID}][ENDAuction][${buyerInfo.buyers[0].user_addr}][change auction state end in local db]`)  
})



app.onlyOnce('POST','/transfer-ownership', async (req, res)=>{
  console.log('/transfer-Ownership', `nft: ${req.body.nft}`)
  const newOwnerCert = req.body.ownershipCert;
  const auctionID = req.body.auctionID;
  console.log(newOwnerCert);

  const buyerInfo = await databaseMiddleware.getCurrentBuyer(newOwnerCert.NFT + "");

  /*test-log*/
  UpdateTestLog(newOwnerCert.NFT, `[${auctionID}][TransferOwner][${buyerInfo.buyers[0].user_addr}][get current buyer in local db]`)  

  const rlpTXResult_change = await auctionMiddleware.changeOwnerCert(newOwnerCert, buyerInfo.buyers[0].user_addr);
  if (rlpTXResult_change != 'success') {
    res.send('failed to change cert..');
    return
  }

  /*test-log*/
  UpdateTestLog(newOwnerCert.NFT, `[${auctionID}][TransferOwner][${buyerInfo.buyers[0].user_addr}][update new ownercert]`)  
  
  // const rlpTXResult_done = await auctionMiddleware.doneAuction(auctionID);
  // if (rlpTXResult_done != 'success') {
  //   res.send('failed to done auction in auction management..');
  //   return
  // }

  await auctionMiddleware.requestDoneAuction(auctionID);
  console.log(
    `[auction:${auctionID}-transfer ownership]`,
    `[nft-${newOwnerCert.NFT}, new owner buyer]:${buyerInfo.buyers[0].user_addr}`);
  
  /*test-log*/
  UpdateTestLog(newOwnerCert.NFT, `[${auctionID}][TransferOwner][${buyerInfo.buyers[0].user_addr}][reqeust change auction state]]`)  
});



app.listen(LOCAL_ACUTION_SERVER_PORT , function() {
  console.log('Express server listening on port ', LOCAL_ACUTION_SERVER_PORT ); // eslint-disable-line
})
