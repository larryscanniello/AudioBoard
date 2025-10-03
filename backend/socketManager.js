
const { Server } = require("socket.io");
const sharedSession = require("express-socket.io-session");


const socketManager = (server,sessionMiddleware) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Your client URL
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  io.use(sharedSession(sessionMiddleware,{
    autoSave: true,
  }));

  io.on('connection', (socket) => {
    let userID;
    if (socket.handshake.session.passport?.user) {
      userID = socket.handshake.session.passport.user;
      console.log("User ID:", userID);
    } else {
      console.log("Unauthenticated socket");
    }
    // Listen for a 'join_room' event
    socket.on('join_room', (roomID) => {
      socket.join(roomID);
      io.to(roomID).emit('request_audio',{})
      console.log(`User ${socket.handshake.session.passport.user} joined room: ${roomID}`);

    });

    socket.on("send_audio",(data)=>{
      console.log('check104',data)
      io.to(data.roomID).emit("receive_audio",{audio:data.audio,i:data.i})
    })

    socket.on("client_to_server_play_audio",(data)=>{
      io.to(data.roomID).emit("server_to_client_play_audio",{})
    })

    socket.on("send_audio_chunk", (data) => {
      // forward chunk to everyone else in the room
      socket.to(data.roomID).emit("receive_audio_chunk",{chunk:data.chunk,first:data.first})
      
    });

    socket.on("send_play_window_to_server",(data)=>{
      socket.to(data.roomID).emit("send_play_window_to_clients",data)
    })
  });

  return io;
};

module.exports = socketManager;