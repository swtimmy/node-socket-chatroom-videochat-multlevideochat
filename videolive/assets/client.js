let peerConnection;
const config = {
  iceServers: [
    {
      urls: ["stun:stun.yourdomain.com", "turn:turn.yourdomain.com"],
      username: "guest",
      credential: "somepassword",
    },
  ],
};

const video = document.querySelector("#remoteVideo");
const button = document.querySelector("button");

$(function () {
  $(button).on("click", function () {
    $(this).remove();
    video.play();
    init();
  });
});

function init() {
  const socket = io.connect(window.location.origin);
  socket.on("offer", (id, description) => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection
      .setRemoteDescription(description)
      .then(() => peerConnection.createAnswer())
      .then((sdp) => peerConnection.setLocalDescription(sdp))
      .then(() => {
        socket.emit("answer", id, peerConnection.localDescription);
      });
    peerConnection.ontrack = (event) => {
      video.srcObject = event.streams[0];
    };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", id, event.candidate);
      }
    };
  });

  socket.on("candidate", (id, candidate) => {
    peerConnection
      .addIceCandidate(new RTCIceCandidate(candidate))
      .catch((e) => console.error(e));
  });

  socket.on("connect", () => {
    socket.emit("watcher");
  });

  socket.on("broadcaster", () => {
    socket.emit("watcher");
  });

  window.onunload = window.onbeforeunload = () => {
    socket.close();
    peerConnection.close();
  };
}
