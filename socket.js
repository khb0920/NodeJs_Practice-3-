const SocketIO = require('socket.io');
const axios = require('axios');
const cookie = require('cookie-signature');
const cookieParser = require('cookie-parser');

module.exports = (server, app, sessionMw) => {
    const io = SocketIO(server, { path: '/socket.io' }); //path옵션 : 클라이언트가 접속할 경로 설정 
    app.set('io', io);              //라우터에서 io객체를 쓸수있게 저장
    const room = io.of('/room');    //Socket.io에 네임스페이스를 부여하는 메서드
    const chat = io.of('/chat');

    io.use((socket, next) => {
        cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res, next);
        sessionMw(socket.request, socket.request.res, next);
    });

    room.on('connection', (socket) => {
        console.log('room 네임스페이스에 접속');
        socket.on('disconnect', () => {
            console.log('room 네임스페이스 접속 해제');
        });
    });
    
    chat.on('connection', (socket) => {
        console.log('chat 네임스페이스에 접속');
        const req = socket.request;
        const { headers: { referer } } = req;
        const roomId = referer
            .split('/')[referer.split('/').length - 1]
            .replace(/\?.+/, '');
        socket.join(roomId);
        // socket.to(roomId).emit('join', {
        //     user: 'system',
        //     chat: `${req.session.color}님이 입장하셨습니다.`,
        //     number: socket.adapter.rooms[roomId].length,
        // });
        axios.post(`http://localhost:8005/room/${roomId}/sys`, {
            type: 'join',
        }, {
            headers: {
                Cookie: `connect.sid=${'s%3A' + cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`
            },
        });

        socket.on('disconnect', () => {
            console.log('chat 네임스페이스 접속 해제');
            socket.leave(roomId);
            const currentRoom = socket.adapter.rooms[roomId];
            const userCount = currentRoom ? currentRoom.length : 0;
            if(userCount === 0){
                const signedCookie = cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET);
                const connectSID = `${signedCookie}`;
                axios.delete(`http://localhost:8005/room/${roomId}`, {
                    headers: {
                        Cookie: `connect.sid=s%3A${connectSID}`
                    }
                })
                    .then(() => {
                        console.log('방 제거 요청 성공');
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            } else {
                axios.post(`http://localhost:8005/room/${roomId}/sys`, {
                    type: 'exit',
                }, {
                    headers: {
                        Cookie: `connect.sid=${'s%3A' + cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`
                    },
                });
            }
        });
        socket.on('wis', (data) => {
            socket.to(data.target).emit('wis', data);
        });
        socket.on('ban', (data) => {
            socket.to(data.id).emit('ban');
        });
        socket.on('delegate', (data) => {
            socket.to(data.id).emit('delegate'); 
        })
    });
};