const express = require('express');
const {Server} = require('socket.io');
const path = require('path');
const app = express();
const ADMIN = "admin";
const words1 = [
            ["apple", "you are imposter"],
            ["car", "you are imposter"],
            ["phone", "you are imposter"], 
            ["computer", "you are imposter"],
            ["banana", "you are imposter"],
            ["bus", "you are imposter"]
            ];


//const port = process.env.PORT || 8080;

const server = app.listen(8080, function(){
    console.log('the server is runing on port 8080');
});


//static setup

app.use(express.static(path.join(__dirname, '../public')));


//state
const UsersState = {
    users: [],
    setUsers: function(newUsersArray){
        this.users = newUsersArray;
    }
}


const io = new Server(server);

const votingReady = {};



io.on('connection', function(socket){
    console.log('make socket conntact: ',socket.id);
// upon connection - only to user
    socket.emit('message',buildMsg(ADMIN, 'Wellcome to Imposter Game') );




socket.on('enterRoom', ({name, room})=>{
 //leave previous room
        const prevRoom = getUser(socket.id)?.room;
            if(prevRoom){
                socket.leave(prevRoom);
                io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} hase left the room`));
            }
        const user = activateUser(socket.id, name, room);
        
//can not update previous room user list until after the state update in activev user

            if(prevRoom){
                io.to(prevRoom).emit('userLiset', {
                    users: getuserInRoom(prevRoom)
                });
            }
//join room
            socket.join(user.room);
//to user how joined
    socket.emit('message', buildMsg(ADMIN, `you have joined the ${user.room} game room`));
//to everyone else
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));
//update user list for room 
io.to(user.room).emit('userList', {
    users: getuserInRoom(user.room)
    
});

//players number 
const players = getuserInRoom(user.room);

if (players.length === 5) {
    giveSecretWords(user.room);
}


//update rooms list for everyone
        io.emit('roomList', {
        rooms: getAllActiveRooms()
    });
});



//when the user disconnect-to all other
socket.on('disconnect', () => {
    const user = getUser(socket.id);
    userLeaveaGame(socket.id);

if (user) {
     io.to(user.room).emit('message',buildMsg(ADMIN, `${user.name} has left the room`));
        io.to(user.room).emit('userList', {
            users: getuserInRoom(user.room)
        });
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        });
    }

});


//listening for message event
socket.on('message', ({ name, text }) => {

    const room = getUser(socket.id)?.room;

    if (room) {
        io.to(room).emit(
            'message',
            buildMsg(name, text)
        );
    }

});


//listen for activity
socket.on('activity', (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
        socket.broadcast.to(room).emit('activity', name);
    }
    });



// READY FOR VOTING
//createing ready for voting aprovale process
socket.on('readyForVoting', () => {
    const user = getUser(socket.id);
    if (!user) return;

    const room = user.room;

    if (!votingReady[room]) {
        votingReady[room] = new Set();
    }
 votingReady[room].add(socket.id);
    const players = getuserInRoom(room);
    console.log(
        `Voting ready: ${votingReady[room].size}/${players.length}`
    );

if (players.length === 5 && votingReady[room].size === 5) {
        io.to(room).emit('startVoting');
        delete votingReady[room];
    }
    });
});


//message buliding
 
function buildMsg(name, text){
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

//user functions

function activateUser(id, name, room){
    const user = {id, name, room}
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !==id),
        user
    ]);
    return user;
}

function userLeaveaGame(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    );
}

function getUser(id){
    return UsersState.users.find(user => user.id === id);
    /** voting function**/
}

function getuserInRoom(room){
    return UsersState.users.filter(user => user.room === room);
}

function getAllActiveRooms(){
    return Array.from(new Set(UsersState.users.map(user => user.room)));
}

//secretWord
function giveSecretWords(room) {

    const players = getuserInRoom(room);

    console.log("Players in room:", players.length);
    console.log("Players:", players.map(player => player.name));

    const randomWord1 = words1[Math.floor(Math.random() * words1.length)];
    const imposterIndex = Math.floor(Math.random() * players.length);

    console.log("Selected words:", randomWord1);
    console.log("Imposter:", players[imposterIndex].name);

    players.forEach((player, index) => {

        if (index === imposterIndex) {

            console.log(player.name, "->", randomWord1[1]);

            io.to(player.id).emit('secretWord', {
                word: randomWord1[1]
            });

        } else {

            console.log(player.name, "->", randomWord1[0]);

            io.to(player.id).emit('secretWord', {
                word: randomWord1[0]
            });

        }

    });
}