const express = require('express');

const app = express();
const path = require('path');
const mongoose = require('mongoose');

const PORT = 3000;

// Web Sockets
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const newsController = require('./controllers/newsController');
const messageController = require('./controllers/messageController');
const userController = require('./controllers/userController');
const geolocController = require('./controllers/geolocController');

const MONGO_URI = `${process.env.MONGO_URI}`;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  dbName: 'DisasterDash',
})
  .then(() => {})
  .catch((err) => {
    throw new Error(`error in db connection: ${err}`);
  });

app.use(express.urlencoded({ extended: false }));

app.use(express.json());
app.use(express.static('assets'));


app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../index.html'));
});

app.get('/loc', geolocController.getCurrentLoc, (req, res) => {
  res.status(200).json(res.locals.locData);
});
app.get('/chooseLoc/:name', geolocController.getEnteredLoc, (req, res) => {
  res.status(200).json(res.locals.cityLoc);
});

// '/main' route redirect
app.get('/main', userController.isLoggedIn, (req, res) => {
  res.status(200).redirect('/');
});

// sign up route
app.post('/signup', userController.createUser, (req, res) => {
  res.json(res.locals.signup);
});

// login route
app.post('/login', userController.verifyUser, userController.setCookie, userController.startSession, (req, res) => {
  res.status(200).json(res.locals.username);
});

// github oauth
app.get('/oathgithub', (req, res, next) => {
  next();
},
userController.github,
userController.setCookie,
userController.startSession,
(req, res) => {
  // what should happen here on successful log in?
  res.redirect('/');
});

// Serve Particle SVG
app.get('/flare', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../client/assets/flame.svg'));
});
// '/news' route will respond with a nested array of arrays,
// each nested array contains scraped data from sources LAFD, LA Times, and Youtube (respectively)
// structured as follows:
// [
//     [ { title: 'LAFD Title', link: 'LAFD.com', picture: 'piclink.com' } ],
//     [ { title: 'LA Times Title', link: 'LATimes.com', picture: 'piclink.com' } ],
//     [ { title: 'Youtube Title', link: 'youtube.com', picture: 'piclink.com' } ]
// ]

app.get('/news', newsController.getNews, (req, res) => {
  res.status(200).json(res.locals.allNews);
});
// '/alerts' route will respond with an array of alerts from LAFD: {title: 'Alert', link: 'www.alertLink.com'}
app.get('/alerts', newsController.getAlerts, (req, res) => {
  res.sendStatus(200);
});

app.use('/build', express.static(path.join(__dirname, '../build')));


// chat start
// get the messages from the database to display them
app.get('/messages', messageController.getMessages, (req, res) => {
  res.json(res.locals.messages);
});
// post the messages to the database
app.post('/messages/create', messageController.postMessages, (req, res) => {
  res.json(res.locals.message);
});
// chat end


// 404 handler
app.use('*', (req, res) => {
  res.sendStatus(404);
});
// global error handler
app.use((err, req, res, next) => {
  res.sendStatus(500);
});


// Web Sockets Implementation
io.on('connection', (socket) => {
  socket.on('disconnect', () => {
  });

  socket.on('chat', (data) => {
    io.sockets.emit('chat', data);
  });
});

http.listen(PORT, () => {
});
