
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
      /*const allSockets = Array.from(io.sockets.sockets.values());
      const others = allSockets.filter(s => s.id !== socket.id)
      console.log('others',others)
      if(others.length>0){
        const randomSocket = others[0];
        randomSocket.to(roomID).emit("request_audio_server_to_client",{user:userID})
      }*/
      socket.to(roomID).emit('request_audio_server_to_client',{user:userID});
      console.log(`User ${socket.handshake.session.passport.user} joined room: ${roomID}`);
    });

    socket.on("send_audio_client_to_server",(data)=>{
      console.log('check3')
      if(data.user==="all"){
        console.log('check2')
        socket.to(data.roomID).emit("receive_audio_server_to_client",{audio:data.audio,i:data.i,length:data.length})
      }else{
        console.log('check1')
        socket.to(data.roomID).emit("receive_audio_server_to_client",{audio:data.audio,i:data.i,length:data.length})
      }
    })

    socket.on("client_to_server_play_audio",(data)=>{
      socket.to(data.roomID).emit("server_to_client_play_audio",{})
    })

    socket.on("send_audio_chunk", (data) => {
      // forward chunk to everyone else in the room
      socket.to(data.roomID).emit("receive_audio_chunk",{chunk:data.chunk,first:data.first})
      
    });

    socket.on("send_play_window_to_server",(data)=>{
      socket.to(data.roomID).emit("send_play_window_to_clients",data)
      console.log('check-151')
    })
  });

  return io;
};

module.exports = socketManager;