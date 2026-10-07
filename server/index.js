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
const votes = {};
const voters = {};
const currentTurn = {};
const eliminatedPlayers = {};
const votingPlayers = {};

io.on('connection', function(socket){
    console.log('make socket conntact: ',socket.id);
// upon connection - only to user
    socket.emit('message',buildMsg(ADMIN, 'Wellcome to Imposter Game') );




socket.on('enterRoom', ({name, room})=>{
    //add room size check
    const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
    if (roomSize >= 5) {
        socket.emit('message', buildMsg(ADMIN, 'Room is full'));
        return;
    }

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

if (players.length === 5 && !eliminatedPlayers[user.room]) {
    giveSecretWords(user.room);
    currentTurn[user.room] = 0;
    io.to(user.room).emit('turn', players[currentTurn[user.room]].id);
}

//the players can chat after returning
if (eliminatedPlayers[user.room]) {
    const activePlayers = players.filter(player => player.name !== eliminatedPlayers[user.room]);
    if (activePlayers.length > 0) {
        currentTurn[user.room] = 0;
        io.to(user.room).emit('turn', activePlayers[currentTurn[user.room]].id);
    }
}



//update rooms list for everyone
        io.emit('roomList', {
        rooms: getAllActiveRooms()
    });
});



//when the user disconnect-to all other
socket.on('disconnect', () => {
const user = getUser(socket.id);
    if (!user) return;
 console.log(`${user.name} disconnected`);
  userLeaveaGame(socket.id);
});


//listening for message event
socket.on('message',(data) => {
const room = data.room;
const user = getUser(socket.id);
//if player is eliminated
if(!user){
    return;
}
//if the player is eliminated skip their turn and move to the next player
if(eliminatedPlayers[room] === user.name){
    console.log('Eliminated player tried to send a message:', user.name);
        currentTurn[room]++;
if (currentTurn[room] >= UsersState.users.filter(user => user.room === room).length) {
        currentTurn[room] = 0;
    }
    const nextPlayer = UsersState.users.filter(user => user.room === room)[currentTurn[room]];
    io.to(room).emit('turn', nextPlayer.id);
    return;
}


//THE eliminated Players CAN NOT SEND MESSAGE
const roomPlayers = UsersState.users.filter(
        user => user.room === room
    );
    const currentPlayer = roomPlayers[currentTurn[room]];
if (!currentPlayer) {
        return;
    }
if (socket.id !== currentPlayer.id) {
        return;
    }
io.to(room).emit('message', buildMsg(data.name, data.text));

    // Next player
    currentTurn[room]++;
if (currentTurn[room] >= roomPlayers.length) {
        currentTurn[room] = 0;
    }
io.to(room).emit(
        'turn',
        roomPlayers[currentTurn[room]].id
    );
});


//listen for activity
socket.on('activity', (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
        socket.broadcast.to(room).emit('activity', name);
    }
    });




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


//get player for voting page
socket.on('getVotingPlayers', (room) => {
console.log('Room received for voting:', room);
socket.join(room);

//to block the eliminated player from voting
    const players = getuserInRoom(room).filter(
        user => user.id !== eliminatedPlayers[room]
    );
     votingPlayers[room] = players;

    console.log("Voting players:", players.map(user => user.name));

    socket.emit('votingPlayers', {
        users: players
        });
    });

    socket.on('leaveVotingRoom', (room) => {
    socket.leave(room);
    console.log(`Voting socket left room: ${room}`);
});


// received voting player from the voting page
socket.on('votePlayer', ({ playerId, playerName, room }) => {

    console.log('Vote received for:', playerId);
     console.log('Voting room:', room);

//cerate state for the room
if(!votes[room]){
    votes[room]= {};
}
if(!voters[room]){
    voters[room] = 0;
}
//count the votes for the player
    if (!votes[room][playerId]) {
        votes[room][playerId] = 0;
    }

    votes[room][playerId]++;

    console.log('Current votes:',room,':', votes[room]);
//count the voters for this room
voters[room]++;
console.log(`Votes received: ${room}: ${voters[room]}/5`);


    // Wait until all 5 players have voted
    if (voters[room] === 5) {

        let eliminatedPlayer = null;
        let highestVotes = 0;

        for (const id in votes[room]) {

            if (votes[room][id] > highestVotes) {
                highestVotes = votes[room][id];
                eliminatedPlayer = id;
            }

        }

        console.log('Voting players for', room, ':', votingPlayers[room]);
        console.log('Eliminated player ID:', eliminatedPlayer);

        const player = UsersState.users.find(
            user => user.id === eliminatedPlayer
        );

        if (player) {
            console.log('Player with most votes:', room, player.name);
            console.log('Votes: ', highestVotes);
//eliminated player room
  
        eliminatedPlayers[room] = player.name;

        io.to(room).emit('votingResult', {
             playerName: player.name,
             votes: highestVotes
            });
//start 5 second timer
let countdown = 5;
            const timer = setInterval(() => {
                io.to(room).emit('countdown', countdown);
                countdown--;
                if(countdown < 0){
                    clearInterval(timer);
                }
            },1000);
        }
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