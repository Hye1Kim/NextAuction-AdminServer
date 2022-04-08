```
kubectl delete namespaces auction-namespace
kubectl delete clusterrolebindings auction-namespace-binding-8
br2k ask-context -f context-ask.yaml -r http://203.250.77.154:9000/context
change accesstoken
```


## local database: mysql in docker

```
//docker 실행
docker run --name mysql-db -v /home/hyewon/project/test/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=auction -e MYSQL_USER=pslab -e MYSQL_PASSWORD=pslab --restart=always -p 3306:3306 -p 8080:8080 -d mysql
//mysql 실행
sudo docker exec -it mysql-db bash
//로그인
mysql -u pslab -p
(password: pslab)
use auction;
CREATE TABLE auction_info
(
    `auction_id`    VARCHAR(100)    NOT NULL,
    `valid_time`    VARCHAR(1000)    NOT NULL,
    `nft`           VARCHAR(200)    NOT NULL,
    `valid_key`     VARCHAR(200)    NOT NULL,
    `user_addr`     VARCHAR(200)    NOT NULL,
    `status`        TINYINT(1)     NOT NULL,
    PRIMARY KEY (`auction_id`)
);
CREATE TABLE buyer_info
(
    `nft`    VARCHAR(45)    NOT NULL,
    `user_addr`    VARCHAR(200)    NOT NULL,
    `user_did`           VARCHAR(200)    NOT NULL,
    `key_id`     VARCHAR(200)    NOT NULL,
    `content_sig`        VARCHAR(800)     NOT NULL,
    `str_contentmeta`        VARCHAR(1000)     NOT NULL,
    `bid_amount`        VARCHAR(45)     NOT NULL,
    PRIMARY KEY (`nft`)
);
------------

mysql --password=root
mysql> use mysql;

mysql> alter user 'userName'@'%' identified with mysql_native_password by 'userPassword';

mysql> FLUSH PRIVILEGES;


```# NextAuction-AdminServer
