const peerConnections = {};

const config = {
  iceServers: [
    {
      urls: ["stun:stun.yourdomain.com", "turn:turn.yourdomain.com"],
      username: "guest",
      credential: "somepassword",
    },
  ],
};

const socket = io.connect(window.location.origin);
const video = document.querySelector("video");
const button = document.querySelector("button");

// Media contrains
const constraints = {
  // video: { facingMode: "user" },
  video: true,
  audio: true,
};

navigator.mediaDevices
  .getUserMedia(constraints)
  .then((stream) => {
    video.srcObject = stream;
    socket.emit("broadcaster");
  })
  .catch((error) => console.error(error));

$(function () {
  $(button).on("click", function () {
    $(this).remove();
    init();
  });
});

function init() {
  socket.on("watcher", (id) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[id] = peerConnection;
    let stream = video.srcObject;
    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", id, event.candidate);
      }
    };

    peerConnection
      .createOffer()
      .then((sdp) => peerConnection.setLocalDescription(sdp))
      .then(() => {
        socket.emit("offer", id, peerConnection.localDescription);
      });

    console.log("client here");
  });

  socket.on("answer", (id, description) => {
    peerConnections[id].setRemoteDescription(description);
    console.log("answered");
  });

  socket.on("candidate", (id, candidate) => {
    peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
    console.log("add candidate");
  });

  socket.on("disconnectPeer", (id) => {
    // peerConnections[id].close();
    peerConnections[id] = null;
    delete peerConnections[id];
    console.log("delete candidate");
  });

  window.onunload = window.onbeforeunload = () => {
    socket.close();
  };
}
