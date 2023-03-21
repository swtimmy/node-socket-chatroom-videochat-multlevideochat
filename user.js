let users = [];
 
const addUser = (id, name) => {
    const existingUser = users.find((user) => {
        return user.name === name
    });
 
    if(existingUser) {
        return false;
    }

    const user = {id:id,name:name,room:null};
 
    users.push(user);
    listUser();
    return true;
}

const listUser = () =>{
	console.log(users)
	return users;
}
 
const removeUser = (id) => {
    const index = users.findIndex((user) => {
        return user.id === id
    });
 
    if(index == -1) {
    	return false;
    }
    users.splice(index,1)[0]
    listUser();
    return true;
}
 
const getUser = (name) => users
        .find((user) => user.name === name);
 
const getUsersInRoom = (name) => users
        .filter((user) => {return user.name === name && user.room != null});

const joinUserRoom = (id, room) =>{
    return changeUserRoom(id,room);
}

const leaveUserRoom = (id) =>{
    return changeUserRoom(id,null);
}

const changeUserRoom = (id, room) =>{
    let existingUser = users.find((user) => {
        return user.id === id
    });
    if(!existingUser) {
        return false;
    }
    existingUser.room = room;
    listUser();
    return true;
}
 
module.exports = {listUser, addUser, removeUser, getUser, getUsersInRoom, joinUserRoom, leaveUserRoom};