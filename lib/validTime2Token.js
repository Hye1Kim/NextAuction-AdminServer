const jwt  = require('jsonwebtoken');
const crypto = require('crypto');

const genJWT = async function (exp,auctionMeta){
    const secretKey = await crypto.randomBytes(64).toString('hex');
    //var exp = auctionMeta.timestamp+'ms';
    var exp = '60000ms'  
    const options = {
        "algorithm": "HS256",
        "expiresIn": exp
    };
    const payload = {
        "auctionMeta" : auctionMeta
    };
    try{
        const validTime = await jwt.sign(payload,secretKey,options);
        const token = {
            'valid_time': validTime,
            'valid_key': secretKey
        }
        return token;

    }catch(err){
        console.log('error: The jwt was not generated...',err);
        return false;
    }
}

const verifyJWT = async function (validTime, validTimeKey){
    try{
        const auctionEND = await jwt.verify(validTime, validTimeKey);   
        return auctionEND ;     
    }catch(err){
        console.log(err);
        return false;

    };
   
}

module.exports.genJWT = genJWT;
module.exports.verifyJWT = verifyJWT;
