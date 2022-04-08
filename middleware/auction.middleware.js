const BAOBAB_RPC_URL = 'https://api.baobab.klaytn.net:8651/';
const BCON_SERVER = 'http://203.250.77.120:8000/';
const LOCAL_AUCTION_SERVER = 'http://127.0.0.1:3002'; //k8s node ???? 
const LOCAL_AUCTION_DONE_SERVER = 'http://203.250.77.154:3001'; ///not replicate

const CONTRACTS = require('../config/auction.contracts');
const AUCTION = require('../config/auction.account');

/*ABI*/
const Caver = require('caver-js')
const caver = new Caver(BAOBAB_RPC_URL)
const keyring = caver.wallet.keyring.createFromPrivateKey(AUCTION.PRIVATE_KEY);
caver.wallet.add(keyring);

const auctionContract = new caver.contract(CONTRACTS.DEPLOYED_ABI_AUCTION, CONTRACTS.DEPLOYED_ADDRESS_AUCTION);
const contentContract = new caver.contract(CONTRACTS.DEPLOYED_ABI_CONTENT, CONTRACTS.DEPLOYED_ADDRESS_CONTENT);


/*lib*/
const transactions = require('../lib/transactions');
const request = require('request');
const { compressPublicKey } = require('caver-js/packages/caver-utils');


async function _genRawTX(_to, _data) {
    const rawTX = new caver.transaction.feeDelegatedSmartContractExecution({
        from: keyring.address,
        to: _to,
        gas: 2000000,
        data: _data
    })
    await caver.wallet.sign(keyring.address, rawTX);
    return rawTX.getRawTransaction();
}



async function startMonitoring(auctionID, auctionInfo, jwt) {
  console.log('start monitoring...');
  const nft = auctionInfo.nft;
  const auctionEndID = setInterval(async () => {
    const validTimeKey = auctionInfo.valid_key;
    const validTime = auctionInfo.valid_time;
    const verifyJWT = await jwt.verifyJWT(validTime, validTimeKey);
    if (!verifyJWT) {
      clearInterval(auctionEndID);
      console.log('...');

      request.post({
        headers: {
          'content-type': 'application/json'
        },
        url: `${LOCAL_AUCTION_SERVER}/end-auction`, //니서버
        body: {
          'auctionID': auctionID,
          'nft': nft
        },
        json: true

      }, function (error, res, body) {
        console.log(error);
      });
    } else {
      console.log('check auction state...');
    }
  }, 1000);
}



async function startAuction(auctionMeta) {
    const metaRawTX = await _genRawTX(
        CONTRACTS.DEPLOYED_ADDRESS_AUCTION,
        auctionContract.methods.auctionCreate(
            auctionMeta.name,
            auctionMeta.timestamp,
            auctionMeta.minPrice,
            auctionMeta.nft,
            auctionMeta.desc,
            auctionMeta.contentCreator,
            auctionMeta.contentOwner,
            auctionMeta.owner,
            CONTRACTS.DEPLOYED_ADDRESS_NFT
        ).encodeABI()
    )
    const rlpTXResult = await transactions.sendingRLPTx("createAucFD", metaRawTX); //non-replication
    return rlpTXResult;
}


async function sendLastBidding(auctionID) {
    const metaRawTX = await _genRawTX(
        CONTRACTS.DEPLOYED_ADDRESS_AUCTION,
        auctionContract.methods.sendLastBid(
            auctionID
        ).encodeABI()
    )
    const rlpTXResult = await transactions.sendingRLPTx("sendLastBidFD", metaRawTX); //non-replication
    return rlpTXResult;
}


async function changeOwnerCert(newOwnerCert, buyerAddr) {
    const metaRawTX = await _genRawTX(
        CONTRACTS.DEPLOYED_ADDRESS_CONTENT,
        contentContract.methods.changeOwnershipCert(
            newOwnerCert.NFT,
            newOwnerCert.ownerDID,
            newOwnerCert.storageSignature.signature,
            newOwnerCert.issueTime,
            buyerAddr, //buyer address
            CONTRACTS.DEPLOYED_ADDRESS_NFT
        ).encodeABI()
    );
    const rlpTXResult = await transactions.sendingRLPTx("changeCertFD", metaRawTX); //non-replication
    console.log(
    "@@@"
    )
    console.log(rlpTXResult)
    console.log('FD_CHANGE_CERT    ' + rlpTXResult);
    return rlpTXResult;
}

async function doneAuction(auctionID) {
    const metaRawTX = await _genRawTX(
        CONTRACTS.DEPLOYED_ADDRESS_AUCTION,
        auctionContract.methods.auctionDone(auctionID).encodeABI()
    );
    const rlpTXResult = await transactions.sendingRLPTx("aucDoneFD", metaRawTX); //non-replication
    console.log('FD_AUC_DONE    ' + rlpTXResult);
    return rlpTXResult;
}


async function cancelAuction(rawTX) {
    const rlpTXResult = await transactions.sendingRLPTx("cancelAucFD", rawTX); //non-replication
    return rlpTXResult
}

async function bidding(rawTX) {
    const biddingRlp = await transactions.sendingRLPTx("bidAucFD", rawTX); //non-replicate
    console.log('FD_BIDDING     ' + biddingRlp);
    return biddingRlp
}


async function checkValidDelegation(nft) {
    const cert = await contentContract.methods.getOwnershipCert(nft).call();
    console.log(cert)
    const delegate = cert.delegations.account.toLowerCase();
    if (delegate != AUCTION.ADDRESS) return false;
    else return true;
}

async function isExistingBid(auctionID) {
    const bidLen = await auctionContract.methods.getBidsCount(auctionID).call();
    if (bidLen != 0) return true;
    else return false;
}

async function isContentOwner(sender, auctionID) {
    try {
        const auction = await auctionContract.methods.getAuctionInfo(auctionID).call()
        const contentOwner = auction[9].toLowerCase();
        if (contentOwner != sender) return false;
        else return true;
    } catch (e) {
        console.log('Error: isContentOwner()');
        console.log(e);
        return false;
    }
}

async function isAuctionEnd(auctionID) {
    const auction = await auctionContract.methods.getAuctionInfo(auctionID).call();
    const endTime = auction[2]
    const now = Date.parse(new Date()) / 1000;
    return (endTime < now) //True:end
}

async function printAuctionEnd(auctionID) {
    setTimeout(async () => {
        const auctionInfo = await auctionContract.methods.getAuctionInfo(auctionID).call();
        console.log(auctionInfo);
        console.log(`${auctionID}: change auction done!`)
    }, 4000);
}


function isEqualSeller(auction, buyer) {
    return (buyer == auction.user_addr)
}

function isBiggerthanLast(auction, amount) {
    return (amount < auction.bid_amount);
}
async function isNotExpired(auction){
    const res = await jwt.verifyJWT(auction.valid_time, auction.valid_key);
    return (res);
}


async function getAuctionID(nft) {
    try {
        const auctionID = await auctionContract.methods.getAucID(nft).call();
        console.log('auctionID:', auctionID);
        return auctionID;
    } catch (e) {
        console.log(e);
        return -1
    }
}


async function getOldOwnerCert(nft) {
    try {
        const oldOwnerCert = await contentContract.methods.getOwnershipCert(nft).call();
        return {
            'contentMeta': {
                'NFT': oldOwnerCert.contentMeta.NFT,
                'created': oldOwnerCert.contentMeta.created,
                'name': oldOwnerCert.contentMeta.name,
                'fileType': oldOwnerCert.contentMeta.fileType,
                'size': oldOwnerCert.contentMeta.size,
                'metaHash': oldOwnerCert.contentMeta.metaHash,
                'contentType': oldOwnerCert.contentMeta.contentType,
                'desc': oldOwnerCert.contentMeta.desc
            },
            'ownerInfo': {
                'did': oldOwnerCert.ownerInfo.did,
                'keyID': oldOwnerCert.ownerInfo.did + '#key-1', //임시
                'history': []
            },
            'storageService': {
                'storageDID': oldOwnerCert.storageSvc.storageDID,
                'downloadEndpoint': oldOwnerCert.storageSvc.downloadEndpoint,
                'accessLocation': oldOwnerCert.storageSvc.accessLocation,
                'reIssueEndpoint': oldOwnerCert.storageSvc.reIssueEndpoint,
                'storageSignature': oldOwnerCert.storageSvc.storageSignature
            },
            'issueTime': oldOwnerCert.issueTime
        }
    } catch (e) {
        console.log(e);
        return -1
    }
}


async function askNewOwnershipCert(auctionID, buyerInfo, oldOwnershipCert) {
    //옥션 서비스가 (소유권 양도에 사용 될) 새로운 소유 증명서를 발급받기 위하여
    //   이전 소유증명서(delegation 정보 제외 후),
    //   비딩할 때 받은 [최종 입찰자의(구매자) 시그니처, 콘텐츠 메타정보, 구매자 did, public key id] 정보들을  스토리지 서비스에게 전달
    request.post({ //non-replication 
        headers: {
            'content-type': 'application/json'
        },
        url: `${BCON_SERVER}newOwnershipCert`,
        body: {
            'oldOwnershipCert': oldOwnershipCert,
            'buyerInfo': buyerInfo,
            'auctionID': auctionID
        },
        json: true
    }, function (error, res, body) {
        console.log(error);
    });
}

async function requestDoneAuction(auctionID) {
    await request.post({ //non-replicate
        headers: {
            'content-type': 'application/json'
        },
        url: `${LOCAL_AUCTION_DONE_SERVER}/done-auction`,
        body: {
            'auctionID': auctionID
        },
        json: true
    }, function (error, res, body) {
        console.log('send to local server:', '/done-auction');
        console.log(error);
    });
}



module.exports = {
    startAuction,
    startMonitoring,
    cancelAuction,
    doneAuction,
    changeOwnerCert,
    bidding,
    sendLastBidding,
    checkValidDelegation,
    isExistingBid,
    isContentOwner,
    isAuctionEnd,
    isEqualSeller,
    isBiggerthanLast,
    isNotExpired,
    getAuctionID,
    getOldOwnerCert,
    printAuctionEnd,
    askNewOwnershipCert,
    requestDoneAuction
}