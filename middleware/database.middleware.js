/* config */
const SQL = require('../config/mysql.config');
const fs = require('fs');
const sql = fs.readFileSync(__dirname+'/dbinit.sql').toString();
/* mysql client */
const mysql_init = require('mysql2')
const mysql = require('mysql2/promise'); //async
let connection = null;
async function createMysqlClient() {
    connection = await mysql.createConnection({
        host: SQL.HOST, // 호스트 주소
        user: SQL.USER, // mysql user
        password: SQL.PASSWORD,
        database: SQL.DATABASE
    });
}

async function dbinit() {
    console.log('.........dbinit.......');
    let con = mysql_init.createConnection({
        host: SQL.HOST,
        user: SQL.USER,
        password: SQL.PASSWORD,
        multipleStatements: true // this allow you to run multiple queries at once.
    });
    con.connect(function(err) {
        if (err) return -1;
        console.log("Connected yet no db is selected yet!");
        
        con.query(sql, function (err, result) {
          if (err) return -1;
          console.log("Database created");
        });
      });
      return 1;

}

setTimeout(()=>{
    console.log("try to connect mysql...!!!")
    createMysqlClient();
    dbinit()
},60000)

async function createAuction(auctionID, auctionMeta, token) {
    try {
        console.log('auctionID:',auctionID)
        const [results] = await connection.execute(
            "INSERT INTO auction_info (auction_id, valid_time, valid_key, nft, user_addr,status) VALUES(?,?,?,?,?,?)",
            [auctionID, token.valid_time, token.valid_key, auctionMeta.nft, auctionMeta.owner, 1]
        );
        return {
            status: 1
        }
    } catch (e) {
        return {
            status: -1,
            err: e
        }
    }
}


async function endAuction(auctionID) {
    try {
        const [result] = await connection.execute(
            "UPDATE auction_info SET status = 0 WHERE auction_id =?",
            [auctionID + ""]);

        if (result.affectedRows != 1) {
            return {
                status: -1,
                err: 'error: No value was updated into the database..'
            }
        } else {
            return {
                status: 1
            }
        }
    } catch (e) {
        return {
            status: -1,
            err: e
        }
    }
}

async function getAuctionInfo(auctionID) {
    try {
        const [rows] = await connection.execute('SELECT * FROM auction_info WHERE auction_id = ?', [auctionID]);
        if (rows[0] == undefined) return -1
        else return rows[0]
    } catch (e) {
        console.log(e)
        return -1
    }

}

async function getCurrentBuyer(nft) {
    try {
        const [rows] = await connection.execute('SELECT * FROM buyer_info WHERE nft = ?', [nft]);
        return {
            isExist: rows.length > 0,
            buyers: rows
        };
    } catch (e) {
        console.log(e)
        return -1
    }

}


async function updateBuyer(nft, address, did, keyID, sig, sigData, amount, isExist) {
    console.log(nft)
    console.log(isExist)
    if (isExist) {
        try {
            await connection.execute(
                "UPDATE auction.buyer_info SET user_addr=?, user_did=?, key_id=?, content_sig=?, str_contentmeta=?, bid_amount=? WHERE nft =?",
                [address, did, keyID, sig, sigData, amount, nft]
            );
            return {
                status: 1
            }
        } catch (e) {
            console.log(e)
            return {
                status: -1,
                err: e
            }
        }
    } else {
        try {
            await connection.execute(
                "INSERT INTO auction.buyer_info (nft,user_addr,user_did,key_id,content_sig,str_contentmeta,bid_amount) VALUES(?,?,?,?,?,?,?)",
                [nft, address, did, keyID, sig, sigData, amount]
            );
            return {
                status: 1
            }
        } catch (e) {
            return {
                status: -1,
                err: e
            }
        }
    }
}


module.exports = {
    createAuction,
    endAuction,
    getAuctionInfo,
    getCurrentBuyer,
    updateBuyer
}