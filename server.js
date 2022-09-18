//requires
const express = require("express");
const app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

// express routing
app.use(express.static("public"));

// signaling
io.on("connection", function (socket) {
  console.log("a user connected");

  socket.on("create or join", function (room) {
    console.log("create or join to room ", room);

    var myRoom = io.sockets.adapter.rooms.get(room) || { length: 0 };
    var numClients = myRoom.length;

    console.log(room, " has ", numClients, " clients");

    if (numClients == 0) {
      socket.join(room);
      socket.emit("created", room);
    } else {
      socket.join(room);
      socket.emit("joined", room);
    }
  });

  socket.on("ready", function (room) {
    socket.to(room).emit("ready");
  });

  socket.on("candidate", function (event) {
    socket.to(event.room).emit("candidate", event);
  });

  socket.on("offer", function (event) {
    socket.to(event.room).emit("offer", event.sdp);
  });

  socket.on("answer", function (event) {
    socket.to(event.room).emit("answer", event.sdp);
  });

  socket.on("toggleAudio", function (event) {
    socket.to(event.room).emit("toggleAudio", event.message);
  });
});

// listener
http.listen(8080, function () {
  console.log("listening on *:8080");
});
