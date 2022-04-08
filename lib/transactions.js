const axios = require('axios');
const fdURL = "http://203.250.77.156:3001/"

const sendingRLPTx = async function(api, rlp){

    const resMETA = await axios({
        url: fdURL + api,
        method: "post",
        data:{
            senderRawTransaction: rlp,
        },
        json: true
    });

    return resMETA.data;

}

module.exports.sendingRLPTx = sendingRLPTx;




