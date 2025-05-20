const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const GroupChat = require('./models/GroupChat');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');

dotenv.config();

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

connectToDatabase();

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
}));

// Utility
async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) reject(err);
        else resolve(userData);
      });
    } else {
      reject('no token');
    }
  });
}

// --- ROUTES ---

app.get('/test', (req, res) => {
  res.json('test ok');
});

app.get('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    // Check if id is a group chat
    const group = await GroupChat.findById(id);
    if (group) {
      if (!group.members.some(memberId => memberId.equals(ourUserId))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const messages = await Message.find({ recipient: id }).sort({ createdAt: 1 });
      return res.json(messages);
    }

    // Otherwise, treat as 1-to-1 chat
    const otherUser = await User.findById(id);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { sender: ourUserId, recipient: id },
        { sender: id, recipient: ourUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);

  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/groupchats', async (req, res) => {
  try {
    const userData = await getUserDataFromRequest(req);
    const userId = userData.userId;
    const groups = await GroupChat.find({ members: userId }).select('name members');
    res.json(groups);
  } catch (err) {
    console.error('Error fetching group chats:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/people', async (req, res) => {
  const search = req.query.search || '';
  const users = await User.find({
    username: { $regex: search, $options: 'i' }
  }, { _id: 1, username: 1 });
  res.json(users);
});

app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json('no token');
  }
});

app.post('/register', async (req, res) => {
  const { username, password, email, mobileNumber, birthday } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

    const createdUser = await User.create({
      username,
      password: hashedPassword,
      email,
      mobileNumber,
      birthday,
    });

    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res
        .cookie('token', token, {
          sameSite: 'lax',
          secure: false,
        })
        .status(201)
        .json({
          id: createdUser._id,
          username: createdUser.username,
        });
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: 'Error during registration' });
  }
});

app.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  try {
    const foundUser = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    });

    if (!foundUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (!passOk) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    jwt.sign({ userId: foundUser._id, username: foundUser.username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res
        .cookie('token', token, {
          sameSite: 'lax',
          secure: false,
        })
        .json({
          id: foundUser._id,
          username: foundUser.username,
        });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Error during login' });
  }
});

app.post('/groupchat', async (req, res) => {
  const { name, members } = req.body;
  const users = await User.find({ username: { $in: members } });
  const memberIds = users.map(u => u._id);
  const group = await GroupChat.create({ name, members: memberIds });
  res.json({ groupId: group._id });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', {
    sameSite: 'lax',
    secure: false,
  }).json('ok');
});

// --- WEBSOCKET ---

const server = app.listen(4000, () => {
  console.log("Server is running on http://localhost:4000");
});

const wss = new WebSocketServer({ server });

wss.on('connection', (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username })),
      }));
    });
  }

  // Heartbeat: robust version
  connection.isAlive = true;
  connection.pingInterval = setInterval(() => {
    if (!connection.isAlive) {
      clearInterval(connection.pingInterval);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('dead');
      return;
    }
    connection.isAlive = false;
    connection.ping();
  }, 30000);

  connection.on('pong', () => {
    connection.isAlive = true;
  });

  connection.on('close', () => {
    clearInterval(connection.pingInterval);
  });

  // extract token from cookie
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) return;
          connection.userId = userData.userId;
          connection.username = userData.username;
        });
      }
    }
  }

  connection.on('message', async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let filename = null;

    if (file) {
      const ext = file.name.split('.').pop();
      filename = Date.now() + '.' + ext;
      const path = __dirname + '/uploads/' + filename;
      const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
      fs.writeFile(path, bufferData, () => {
        console.log('file saved:' + path);
      });
    }

    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      });

      // --- GROUP CHAT SUPPORT ---
      if (mongoose.Types.ObjectId.isValid(recipient)) {
        const group = await GroupChat.findById(recipient);
        if (group) {
          group.members.forEach(memberId => {
            if (memberId.toString() !== connection.userId) {
              [...wss.clients]
                .filter(c => c.userId === memberId.toString())
                .forEach(c => c.send(JSON.stringify({
                  text,
                  sender: connection.userId,
                  recipient,
                  file: file ? filename : null,
                  _id: messageDoc._id,
                })));
            }
          });
          return;
        }
      }

      // --- 1-to-1 fallback ---
      [...wss.clients]
        .filter(c => c.userId === recipient)
        .forEach(c => c.send(JSON.stringify({
          text,
          sender: connection.userId,
          recipient,
          file: file ? filename : null,
          _id: messageDoc._id,
        })));
    }
  });

  notifyAboutOnlinePeople();
});
