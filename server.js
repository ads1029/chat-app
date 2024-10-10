const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 设置静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 处理根路径请求
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join', (data) => {
    const { room, username } = data;
    socket.join(room);
    socket.to(room).emit('user-joined', username);
    
    if (!rooms[room]) {
      rooms[room] = new Set();
    }
    rooms[room].add(socket.id);

    io.to(socket.id).emit('room-users', Array.from(rooms[room]));
  });

  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      sdp: data.sdp,
      sender: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      sdp: data.sdp,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    for (const room in rooms) {
      rooms[room].delete(socket.id);
      if (rooms[room].size === 0) {
        delete rooms[room];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));