var winstonDaily = require('winston-daily-rotate-file');
const {
    createLogger,
    format,
    transports
} = require('winston'); // 한번에 여러개의 객체를 한번에 만든다. 모든 변수가 winston관련 모듈을 불러온다
// const { combine, timestamp, printf } = format;                                                                //  format.combine,  format.timestamp,  format.printf 이런것들이 귀찮으면  상단처럼 정의하고 코드에는 format을 제외해도 된다. 지금은 format을 붙여 호출
const logger = createLogger({ //  winston모듈에서 createLogger를 생성하여 logger생성 (3버젼이 되면서 winston.createLogger로는 error가 뜬다.)
    // const logger = new (winston.createLogger)({                                                  //  "winston.Logger is not a constructor"  에러뜨는 이유는 상단에서 객체를 생성했기 때문
    // const logger = new (winston.Logger)({                                                            //  "winston.Logger is not a constructor"  에러뜨는 이유는 상단에서 객체를 생성했기 때문
    transports: [
        new(winstonDaily)({ // 로그파일 생성에 관한 설정
            name: 'info-file',
            filename: `log/contents-sever-%DATE%.log`, // %DATE% 이부분이 날짜로 변경, 경로를지정,
            colorize: false,
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "1000",
            level: "info",
            format: format.combine( // 관련설정 포멧을 설정
                format.label({
                    label: 'contents-server'
                }), // 라벨을 정의(서버호스트명으로 많이사용)
                // format.colorize(), // 파일에서는 이게 있으면 색상이 변경되는게 아니고 색상의 문자열이 나타난다.
                format.timestamp({ // 시간의 형식을 정의
                    format: "YYYY-MM-DD HH:mm:ss"
                }),
                format.printf( // 파일안에 로그의 형식을 정의
                    info => `{"${info.timestamp}"  "[${info.label}]"  "${info.level}"  "${info.message}"}`
                )
            ),
            showlevel: true,
            json: false,
        }),
        new(transports.Console)({
            name: 'debug-console',
            colorize: true,
            level: "debug",
            format: format.combine(
                format.label({
                    label: 'docker-crzwas01'
                }),
                format.colorize(),
                format.timestamp({
                    format: "YYYY-MM-DD HH:mm:ss"
                }),
                format.printf(
                    info => `{"${info.timestamp}"  "[${info.label}]"  "${info.level}"  "${info.message}"}`
                )
            ),
            showlevel: true,
            json: false,
        })
    ]
});
logger.stream = { // httpd log  출력하기
    write: function (message, encoding) {
        logger.info(message); // 단순히 message를 default 포맷으로 출력
    },
};
module.exports = logger; // 외부에서 해당 파일을 호출할수 있게 모듈화