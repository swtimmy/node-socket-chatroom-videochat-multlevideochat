"use strict";

const baseURL = "/";

let localVideo = document.querySelector("#localVideo");
let remoteVideo = document.querySelector("#remoteVideo");

let otherUser;
let remoteRTCMessage;

let iceCandidatesFromCaller = [];
let peerConnection;
let remoteStream;
let localStream;

let callInProgress = false;

function login() {
  let userName = document.getElementById("userNameInput").value;
  if (userName == "") {
    return false;
  }
  myName = userName.replace(/<[^>]*>?/gm, "").toUpperCase();
  connectSocket();
}

//event from html
function call() {
  let userToCall = document.getElementById("callName").value;
  if (userToCall == "") {
    return false;
  }
  otherUser = userToCall.replace(/<[^>]*>?/gm, "").toUpperCase();

  beReady().then((bool) => {
    processCall(userToCall);
  });
}

function cancelCall() {
  stop();
}

function endcall() {
  socket.emit("endcall");
  stop();
}

//event from html
function answer() {
  //do the event firing

  beReady().then((bool) => {
    processAccept();
  });

  document.getElementById("answer").style.display = "none";
}

const pcConfig = {
  iceServers: [
    {
      urls: ["stun:stun.yourdomain.com", "turn:turn.yourdomain.com"],
      username: "guest",
      credential: "somepassword",
    },
  ],
};

// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

/////////////////////////////////////////////

let socket;
function connectSocket() {
  socket = io.connect(baseURL, {
    query: {
      name: myName,
    },
  });

  socket.emit("joinVideoCallPlatform");

  socket.on("joinVideoCallPlatform", (res) => {
    if (res) {
      document.getElementById("userName").style.display = "none";
      document.getElementById("call").style.display = "block";
      document.getElementById("nameHere").innerHTML = myName;
      document.getElementById("userInfo").style.display = "block";
    } else {
      document.getElementById("userName").style.display = "block";
      document.getElementById("call").style.display = "none";
      document.getElementById("nameHere").innerHTML = "";
      document.getElementById("userInfo").style.display = "none";
      alert("Existing Username");
    }
  });

  socket.on("peeruserNotInCall", () => {
    stop();
    alert("Host gone");
  });

  socket.on("nouser", () => {
    document.getElementById("call").style.display = "block";
    document.getElementById("otherUserNameCA").innerHTML = "";
    document.getElementById("calling").style.display = "none";
    stop();
    alert("User not exist");
  });

  socket.on("peeruserInOtherCall", () => {
    document.getElementById("call").style.display = "block";
    document.getElementById("otherUserNameCA").innerHTML = "";
    document.getElementById("calling").style.display = "none";
    stop();
    alert("User is in other call");
  });

  socket.on("errorMsg", (msg) => {
    alert(msg);
  });

  socket.on("newCall", (data) => {
    //when other called you
    //show answer button

    otherUser = data.caller;
    remoteRTCMessage = data.rtcMessage;

    // document.getElementById("profileImageA").src = baseURL + callerProfile.image;
    document.getElementById("callerName").innerHTML = otherUser;
    document.getElementById("call").style.display = "none";
    document.getElementById("answer").style.display = "block";
  });

  socket.on("callAnswered", (data) => {
    //when other accept our call
    remoteRTCMessage = data.rtcMessage;
    peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteRTCMessage)
    );
    document.getElementById("calling").style.display = "none";

    callProgress();
  });

  socket.on("ICEcandidate", (data) => {
    // console.log(data);
    console.log("GOT ICE candidate");

    let message = data.rtcMessage;

    let candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate,
    });

    if (peerConnection) {
      console.log("ICE candidate Added");
      peerConnection.addIceCandidate(candidate);
    } else {
      console.log("ICE candidate Pushed");
      iceCandidatesFromCaller.push(candidate);
    }
  });

  socket.on("disconnectPeer", function () {
    stop();
  });
}

/**
 *
 * @param {Object} data
 * @param {number} data.name - the name of the user to call
 * @param {Object} data.rtcMessage - the rtc create offer object
 */
function sendCall(data) {
  //to send a call
  console.log("Send Call");
  socket.emit("call", data);

  document.getElementById("call").style.display = "none";
  // document.getElementById("profileImageCA").src = baseURL + otherUserProfile.image;
  document.getElementById("otherUserNameCA").innerHTML = otherUser;
  document.getElementById("calling").style.display = "block";
}

/**
 *
 * @param {Object} data
 * @param {number} data.caller - the caller name
 * @param {Object} data.rtcMessage - answer rtc sessionDescription object
 */
function answerCall(data) {
  //to answer a call
  socket.emit("answerCall", data);
  callProgress();
}

/**
 *
 * @param {Object} data
 * @param {number} data.user - the other user //either callee or caller
 * @param {Object} data.rtcMessage - iceCandidate data
 */
function sendICEcandidate(data) {
  //send only if we have caller, else no need to
  console.log("Send ICE candidate");
  socket.emit("ICEcandidate", data);
}

function beReady() {
  return navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
      localStream = stream;
      localStream.stop = function () {
        this.getAudioTracks().forEach(function (track) {
          track.stop();
        });
        this.getVideoTracks().forEach(function (track) {
          //in case... :)
          track.stop();
        });
      };
      localVideo.srcObject = localStream;
      return createConnectionAndAddStream();
    })
    .catch(function (e) {
      alert("getUserMedia() error: " + e.name);
    });
}

function createConnectionAndAddStream() {
  createPeerConnection();
  // peerConnection.addStream(localStream);
  localStream.getTracks().forEach(function (track) {
    peerConnection.addTrack(track, localStream);
  });
  return true;
}

function processCall(userName) {
  peerConnection.createOffer().then(function (description) {
    peerConnection
      .setLocalDescription(description)
      .then(function () {
        sendCall({
          name: userName,
          rtcMessage: description,
        });
      })
      .catch((e) => console.log(e));
  });
}

function processAccept() {
  peerConnection
    .setRemoteDescription(new RTCSessionDescription(remoteRTCMessage))
    .then(function () {
      if (remoteRTCMessage.type == "offer") {
        peerConnection
          .createAnswer()
          .then(function (description) {
            peerConnection
              .setLocalDescription(description)
              .then(function () {
                if (iceCandidatesFromCaller.length > 0) {
                  console.log(iceCandidatesFromCaller);
                  for (let i = 0; i < iceCandidatesFromCaller.length; i++) {
                    let candidate = iceCandidatesFromCaller[i];
                    console.log("ICE candidate Added From queue");
                    try {
                      peerConnection
                        .addIceCandidate(candidate)
                        .then((done) => {
                          console.log(done);
                        })
                        .catch((error) => {
                          console.log(error);
                        });
                    } catch (error) {
                      console.log(error);
                    }
                  }
                  iceCandidatesFromCaller = [];
                  console.log("ICE candidate queue cleared");
                } else {
                  console.log("NO Ice candidate in queue");
                }
                console.log("go ansercall function");
              })
              .catch((e) => console.log(e));
            answerCall({
              caller: otherUser,
              rtcMessage: description,
            });
          })
          .catch((e) => console.log(e));
      }
    })
    .catch((e) => console.log(e));
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    peerConnection = new RTCPeerConnection(pcConfig);
    // peerConnection = new RTCPeerConnection();
    peerConnection.onicecandidate = handleIceCandidate;
    // peerConnection.onaddstream = handleRemoteStreamAdded;
    peerConnection.ontrack = handleRemoteStreamAdded;
    peerConnection.onremovestream = handleRemoteStreamRemoved;
    console.log("Created RTCPeerConnnection");
    return;
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object.");
    return;
  }
}

function handleIceCandidate(event) {
  // console.log('icecandidate event: ', event);
  if (event.candidate) {
    console.log("Local ICE candidate");
    // console.log(event.candidate.candidate);

    sendICEcandidate({
      user: otherUser,
      rtcMessage: {
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      },
    });
  } else {
    console.log("End of candidates.");
  }
}

function handleRemoteStreamAdded(event) {
  console.log("Remote stream added.");
  remoteStream = event.streams[0];
  // remoteStream = event.stream;
  // remoteVideo.srcObject = remoteStream;
  remoteVideo.srcObject = remoteStream;
  connectToSpeaker(remoteStream, 3);
}

function connectToSpeaker(remoteAudioStream, gain) {
  try {
    const AudioCtx = window.AudioContext || window["webkitAudioContext"];
    const context = new AudioCtx();
    const audioNode = context.createMediaStreamSource(remoteAudioStream);
    const gainNode = context.createGain();
    // some device volume too low ex. iPad
    gainNode.gain.value = gain;
    audioNode.connect(gainNode);
    gainNode.connect(context.destination);
  } catch (ex) {
    // will throw an exception if no audio track exists
    console.error(ex);
  }
}

function handleRemoteStreamRemoved(event) {
  console.log("Remote stream removed. Event: ", event);
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
}

window.onbeforeunload = function () {
  if (callInProgress) {
    stop();
  }
};

function stop() {
  socket.emit("cancelcall");
  setTimeout(function () {
    localStream.stop();
  }, 1);
  // localStream.getTracks().forEach(track => track.stop());
  callInProgress = false;
  // peerConnection.close();
  peerConnection = null;
  document.getElementById("call").style.display = "block";
  document.getElementById("answer").style.display = "none";
  document.getElementById("inCall").style.display = "none";
  document.getElementById("calling").style.display = "none";
  document.getElementById("videos").style.display = "none";
  document.getElementById("otherUserNameC").innerHTML = "";
  otherUser = null;
}

function callProgress() {
  document.getElementById("videos").style.display = "block";
  document.getElementById("otherUserNameC").innerHTML = otherUser;
  document.getElementById("inCall").style.display = "block";

  callInProgress = true;
}

function alert(msg) {
  new swal({
    title: msg,
    icon: "warning",
  });
}
