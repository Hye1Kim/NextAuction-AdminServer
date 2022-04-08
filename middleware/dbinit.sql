USE `auction`;

CREATE TABLE IF NOT EXISTS auction_info
(     
    `auction_id`    VARCHAR(100)     NOT NULL,     
    `valid_time`    VARCHAR(1000)    NOT NULL,     
    `nft`           VARCHAR(200)     NOT NULL,     
    `valid_key`     VARCHAR(200)     NOT NULL,     
    `user_addr`     VARCHAR(200)     NOT NULL,     
    `status`        TINYINT(1)       NOT NULL,     
    PRIMARY KEY (`auction_id`) 
);


CREATE TABLE IF NOT EXISTS buyer_info 
(    
    `nft`               VARCHAR(45)     NOT NULL,
    `user_addr`         VARCHAR(200)    NOT NULL,
    `user_did`          VARCHAR(200)    NOT NULL,     
    `key_id`            VARCHAR(200)    NOT NULL,     
    `content_sig`       VARCHAR(800)    NOT NULL,     
    `str_contentmeta`   VARCHAR(1000)   NOT NULL,     
    `bid_amount`        VARCHAR(45)     NOT NULL,     
    PRIMARY KEY (`nft`) 
);

