const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieparser = require('cookie-parser');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');

dotenv.config();
const webSocket = require('./socket');
const home = require('./routes');
const connect = require('./schemas');
const ColorHash = require('color-hash');

const app = express();
app.set('port', process.env.PORT || 8005);
app.set('view engine', 'html');

nunjucks.configure('views', {
    express: app,
    watch: true,
});
connect();

const sessionMw = session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    },
});
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/gif', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieparser(process.env.COOKIE_SECRET));
app.use(sessionMw);

app.use((req, res, next) => {
    if(!req.session.color){
        const colorHash = new ColorHash();
        req.session.color = colorHash.hex(req.sessionID);
    }
    next();
});

app.use('/', home);

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err: {};
    res.status(err.status || 500);
    res.render('error');
});

const server = app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트 대기중');
});

webSocket(server, app, sessionMw);

