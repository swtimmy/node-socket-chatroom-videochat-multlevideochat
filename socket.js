const { Server } = require('socket.io');
const { listUser, addUser, removeUser, getUser, getUsersInRoom, joinUserRoom, leaveUserRoom } = require("./user");

let IO;

module.exports.initIO = (httpServer,page) => {
    IO = new Server(httpServer);

    let broadcaster
    let users = {};
    let multiplevideocallroom
    let stringMsg = [];

    //videocall
    IO.use((socket, next) => {
        if (socket.handshake.query) {
            let userName = socket.handshake.query.name
            if(userName){
                userName = userName.replace(/<[^>]*>?/gm, '');    
                userName = userName.toUpperCase();
            }
            socket.user = userName;
            next();
        }
    })
    IO.on('connection', (socket) => {
        console.log(socket.user, "Connected");

        //videocall  
        socket.on('joinVideoCallPlatform', ()=>{
            //check user exist
            if(addUser(socket.id,socket.user)){
                socket.join(socket.user);
                socket.emit('joinVideoCallPlatform',true);
            }else{
                socket.emit('joinVideoCallPlatform',false);
            }
        })
        socket.on('endcall', ()=>{
            if(socket.peeruser){
                socket.to(socket.peeruser).emit("disconnectPeer")
            }
        })
        socket.on('cancelcall', ()=>{
            leaveUserRoom( socket.id );
        })
        socket.on('call', (data) => {
            let peeruser = (data.name).replace(/<[^>]*>?/gm, '');
            peeruser = peeruser.toUpperCase();
            if(!getUser(peeruser)){
                socket.emit('nouser')
                return false;
            }
            if(getUsersInRoom(peeruser).length != 0 || peeruser==socket.user){
                socket.emit('peeruserInOtherCall')
                listUser();
                return false;
            }
            joinUserRoom( socket.id, socket.user );
            let rtcMessage = data.rtcMessage;
            socket.peeruser = peeruser;
            socket.to(peeruser).emit("newCall", {
                caller: socket.user,
                rtcMessage: rtcMessage
            })
        })
        socket.on('answerCall', (data) => {
            let caller = data.caller;
            rtcMessage = data.rtcMessage
            if(getUsersInRoom(data.caller).length==0){
                socket.emit('peeruserNotInCall')
                return false;
            }
            joinUserRoom( socket.id, data.caller );
            socket.peeruser = data.caller;
            socket.to(caller).emit("callAnswered", {
                callee: socket.user,
                rtcMessage: rtcMessage
            })
        })
        socket.on('ICEcandidate', (data) => {
            let otherUser = data.user;
            let rtcMessage = data.rtcMessage;
            socket.to(otherUser).emit("ICEcandidate", {
                sender: socket.user,
                rtcMessage: rtcMessage
            })
        })
        function videocall_disconnect(){
            if(socket.peeruser){
                socket.to(socket.peeruser).emit("disconnectPeer")
                console.log(socket.peeruser)
            }
        }

        //chat
        const time = new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        socket.broadcast.emit('recieveRoomMessage','<label><i>New User Join <small class="ms-2">'+time+'</small></i></label>');
        socket.on('sendRoomMessage',(text)=>{
            let newTest = text.replace(/<[^>]*>?/gm, '');
            IO.emit('recieveRoomMessage',newTest);
            stringMsg.push(newTest);
            if(stringMsg.length>100){
                stringMsg.shift();
            }
        });
        socket.on('getRoomMessage',()=>{
            socket.emit("getRoomMessage",stringMsg);
        })
        socket.on('removeRoomMessage',()=>{
            stringMsg = [];
            socket.broadcast.emit("getRoomRemoveMessage");
        })

        //videolive
        socket.on("broadcaster", () => {
            broadcaster = socket.id;
            socket.broadcast.emit("broadcaster");
        });
        socket.on("watcher", () => {
            socket.to(broadcaster).emit("watcher", socket.id);
        });
        socket.on("offer", (id, message) => {
            socket.to(id).emit("offer", socket.id, message);
        });
        socket.on("answer", (id, message) => {
          socket.to(id).emit("answer", socket.id, message);
        });
        socket.on("candidate", (id, message) => {
          socket.to(id).emit("candidate", socket.id, message);
        });
        function videolive_disconnect(){
            if(broadcaster){
                socket.to(broadcaster).emit("disconnectPeer", socket.id);
            }
        }

        //multiplevideocall
        socket.on('joinMultipleVideoCallPlatform', ()=>{
            socket.join("myroom");
            IO.sockets.emit("multiVideoJoin", socket.id, IO.sockets.adapter.rooms.get("myroom").size, Array.from(IO.sockets.adapter.rooms.get("myroom")));
        })
        socket.on('multiVideoSignal', (toId, message) => {
            IO.to(toId).emit('multiVideoSignal', socket.id, message);
        });
        function multiVideo_disconnect(){
            let count = 0;
            if(IO.sockets.adapter.rooms.get("myroom")){
                count = IO.sockets.adapter.rooms.get("myroom").size;
            }
            IO.sockets.emit("multiVideoLeft", socket.id, count);
        }

        //disconnect
        socket.on("disconnect", () => {
            videocall_disconnect()
            videolive_disconnect()
            multiVideo_disconnect()
            removeUser(socket.id)
        });

        //socket.emit send to self
        //IO.emit send to global
    })
}

module.exports.getIO = () => {
    if (!IO) {
        throw Error("IO not initilized.")
    } else {
        return IO;
    }
}