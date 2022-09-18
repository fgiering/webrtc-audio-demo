"use strict";

// getting dom elements
var divSelectRoom = document.getElementById("selectRoom");
var caller = document.getElementById("caller");
var listener = document.getElementById("listener");
var btnConnect = document.getElementById("connect");
var localVideo = document.getElementById("localVideo");
var audioplayer = document.getElementById("audioplayer");
var listAudioEvents = document.getElementById("audioEvents");
var toggleMute = document.getElementById("toggleMute");

// variables
var roomNumber = "webrtc-audio-demo";
var localStream;
var remoteStream;
var rtcPeerConnection;
var iceServers = {
  iceServers: [
    {
      url: "stun:stun.services.mozilla.com",
    },
    {
      url: "stun:stun.l.google.com:19302",
    },
  ],
};
var streamConstraints;
var isCaller;

var socket = io();

btnConnect.onclick = () => initiateCall(true);

function initiateCall(audio) {
  streamConstraints = {
    video: false,
    audio: audio,
  };
  socket.emit("create or join", roomNumber);
  divSelectRoom.hidden = true;
}

// message handlers
socket.on("created", function (room) {
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then(function (stream) {
      addLocalStream(stream);
      isCaller = true;
    })
    .catch(function (err) {
      console.log("An error ocurred when accessing media devices");
    });
  caller.hidden = false;
  listener.hidden = false;
});

socket.on("joined", function (room) {
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then(function (stream) {
      addLocalStream(stream);
      socket.emit("ready", roomNumber);
    })
    .catch(function (err) {
      console.log("An error ocurred when accessing media devices");
    });
});

socket.on("candidate", function (event) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

socket.on("ready", function () {
  if (isCaller) {
    createPeerConnection();
    let offerOptions = {
      offerToReceiveAudio: 1,
    };
    rtcPeerConnection
      .createOffer(offerOptions)
      .then((desc) => setLocalAndOffer(desc))
      .catch((e) => console.log(e));
  }
});

socket.on("offer", function (event) {
  if (!isCaller) {
    createPeerConnection();
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection
      .createAnswer()
      .then((desc) => setLocalAndAnswer(desc))
      .catch((e) => console.log(e));
  }
});

socket.on("answer", function (event) {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

// for development a catch-all-listener:
socket.onAny((event, ...args) => {
  console.log(event, args);
});

toggleMute.addEventListener("click", () => {
  localStream.getAudioTracks()[0].enabled =
    !localStream.getAudioTracks()[0].enabled;
  socket.emit("toggleAudio", {
    type: "toggleAudio",
    room: roomNumber,
    message: localStream.getAudioTracks()[0].enabled
      ? "Remote user's audio is unmuted"
      : "Remote user's audio is muted",
  });
});

// handler functions
function onIceCandidate(event) {
  if (event.candidate) {
    console.log("sending ice candidate");
    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomNumber,
    });
  }
}

function onAddStream(event) {
  audioplayer.srcObject = event.stream;
  remoteStream = event.stream;
  if (remoteStream.getAudioTracks().length > 0) {
    addAudioEvent("Remote user is sending Audio");
  } else {
    addAudioEvent("Remote user is not sending Audio");
  }
}

function setLocalAndOffer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);
  socket.emit("offer", {
    type: "offer",
    sdp: sessionDescription,
    room: roomNumber,
  });
}

function setLocalAndAnswer(sessionDescription) {
  rtcPeerConnection.setLocalDescription(sessionDescription);
  socket.emit("answer", {
    type: "answer",
    sdp: sessionDescription,
    room: roomNumber,
  });
}

//utility functions
function addLocalStream(stream) {
  localStream = stream;
}

function createPeerConnection() {
  rtcPeerConnection = new RTCPeerConnection(iceServers);
  rtcPeerConnection.onicecandidate = onIceCandidate;
  rtcPeerConnection.onaddstream = onAddStream;
  rtcPeerConnection.addStream(localStream);
}

function addAudioEvent(event) {
  var p = document.createElement("p");
  p.appendChild(document.createTextNode(event));
  listAudioEvents.appendChild(p);
}
