var localVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];
const baseURL = "/";

const pcConfig = {
  iceServers: [
    {
      urls: ["stun:stun.yourdomain.com", "turn:turn.yourdomain.com"],
      username: "guest",
      credential: "somepassword",
    },
  ],
};

let socket;

function pageReady() {
  localVideo = document.getElementById("localVideo");
  remoteVideo = document.getElementById("remoteVideo");

  var constraints = {
    video: true,
    audio: true,
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(getUserMediaSuccess)
      .then(function () {
        socket = io.connect(baseURL, { secure: true });

        socket.emit("joinMultipleVideoCallPlatform");

        socket.on("multiVideoSignal", gotMessageFromServer);

        socket.on("connect", function () {
          socketId = socket.id;

          socket.on("multiVideoLeft", function (id, count) {
            var video = document.querySelector('[data-socket="' + id + '"]');
            if (video) {
              var parentDiv = video.parentElement;
              video.parentElement.parentElement.removeChild(parentDiv);
              updateLayout();
            }
            getCountOfUser(count);
          });

          socket.on("multiVideoJoin", function (id, count, clients) {
            clients.forEach(function (socketListId) {
              if (!connections[socketListId]) {
                connections[socketListId] = new RTCPeerConnection(pcConfig);
                connections[socketListId].onicecandidate = function () {
                  if (event.candidate != null) {
                    console.log("SENDING ICE");
                    socket.emit(
                      "multiVideoSignal",
                      socketListId,
                      JSON.stringify({ ice: event.candidate })
                    );
                  }
                };

                connections[socketListId].ontrack = (event) => {
                  gotRemoteStream(event, socketListId);
                };

                localStream.getTracks().forEach(function (track) {
                  connections[socketListId].addTrack(track, localStream);
                });
              }
            });

            if (count >= 2) {
              connections[id].createOffer().then(function (description) {
                connections[id]
                  .setLocalDescription(description)
                  .then(function () {
                    socket.emit(
                      "multiVideoSignal",
                      id,
                      JSON.stringify({ sdp: connections[id].localDescription })
                    );
                  })
                  .catch((e) => console.log(e));
              });
            }
            getCountOfUser(count);
          });
        });
      });
  } else {
    alert("Your browser does not support getUserMedia API");
  }
}

function getCountOfUser(count) {
  $("#connections span").text(count);
  $("#connections").removeClass("d-none");
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

function gotRemoteStream(event, id) {
  if ($("div[id=" + id + "]").length > 0) {
    return false;
  }

  var videos = document.querySelectorAll("video"),
    video = document.createElement("video"),
    div = document.createElement("div");
  div.className = "client";
  div.id = id;

  video.setAttribute("data-socket", id);
  video.srcObject = event.streams[0];
  video.autoplay = true;
  video.muted = true;
  video.playsinline = true;
  video.setAttribute("playsinline", true);

  div.appendChild(video);
  document.querySelector(".videos").appendChild(div);
  updateLayout();
}

$(window).resize(function () {
  updateLayout();
});

function updateLayout() {
  let users = $("video").length - 1;
  const width = $(document).innerWidth();
  const height = $(document).innerHeight();
  if (height > width) {
    if (users == 1) {
      $(".client").css({ width: "100vw", height: "100vh" });
    } else if (users == 2) {
      $(".client").css({ width: "100vw", height: "50vh" });
    } else if (users == 3) {
      $(".client").css({ width: "100vw", height: "33vh" });
    } else if (users <= 4) {
      $(".client").css({ width: "50vw", height: "50vh" });
    } else if (users <= 6) {
      $(".client").css({ width: "50vw", height: "33vh" });
    } else if (users <= 9) {
      $(".client").css({ width: "33vw", height: "33vh" });
    } else if (users <= 16) {
      $(".client").css({ width: "25vw", height: "25vh" });
    } else if (users <= 25) {
      $(".client").css({ width: "20vw", height: "20vh" });
    } else if (users <= 36) {
      $(".client").css({ width: "16.6vw", height: "16.6vh" });
    } else if (users <= 49) {
      $(".client").css({ width: "14.2vw", height: "14.2vh" });
    }
  } else {
    if (users == 1) {
      $(".client").css({ width: "100vw", height: "100vh" });
    } else if (users == 2) {
      $(".client").css({ width: "50vw", height: "100vh" });
    } else if (users <= 4) {
      $(".client").css({ width: "50vw", height: "50vh" });
    } else if (users <= 6) {
      $(".client").css({ width: "33vw", height: "50vh" });
    } else if (users <= 9) {
      $(".client").css({ width: "33vw", height: "33vh" });
    } else if (users <= 16) {
      $(".client").css({ width: "25vw", height: "25vh" });
    } else if (users <= 25) {
      $(".client").css({ width: "20vw", height: "20vh" });
    } else if (users <= 36) {
      $(".client").css({ width: "16.6vw", height: "16.6vh" });
    } else if (users <= 49) {
      $(".client").css({ width: "14.2vw", height: "14.2vh" });
    }
  }
}

function gotMessageFromServer(fromId, message) {
  var signal = JSON.parse(message);

  if (fromId != socketId) {
    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(function () {
          if (signal.sdp.type == "offer") {
            connections[fromId]
              .createAnswer()
              .then(function (description) {
                connections[fromId]
                  .setLocalDescription(description)
                  .then(function () {
                    socket.emit(
                      "multiVideoSignal",
                      fromId,
                      JSON.stringify({
                        sdp: connections[fromId].localDescription,
                      })
                    );
                  })
                  .catch((e) => console.log(e));
              })
              .catch((e) => console.log(e));
          }
        })
        .catch((e) => console.log(e));
    }

    if (signal.ice) {
      connections[fromId]
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((e) => console.log(e));
    }
  }
}
