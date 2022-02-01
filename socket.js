const SocketIO = require('socket.io');

module.exports = (server) => {
    const io = SocketIO(server, { path: '/socket.io' });

    io.on('connection', (socket) => {
        const req = socket.request;             // 웹 소켓 연결시 이벤트 리스너
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress; //클라이언트의 ip를 알아내는방법
        console.log('새로운 클라이언트 접속', ip, socket.id, req.ip);
        socket.on('disconnect', () => {             //연결 종료 했을 때
            console.log('클라이언트 접속 해제', ip, socket.id);
            clearInterval(socket.interval);         //setInterval을 정리 메모리문제 때문
        });
        socket.on('error', (error) => {                 //웹소켓 연결 중 에러 발생할 때
            console.error(error);
        });
        socket.on('reply', (data) => {                      //클라이언트에게 메시지 수신할 때 
            console.log(data);
        });
        socket.interval = setInterval(() => {           //3초마다 연결된 클라이언트에게 메시지를 보내는 부분
            socket.emit('news', 'Hello Socket.IO');
        }, 3000);
    });
};