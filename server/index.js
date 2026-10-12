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
const currentRound = {};
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

    eliminatedPlayers[user.room] = [];
    currentRound[user.room] = 1;

    giveSecretWords(user.room);
    currentTurn[user.room] = 0;
    io.to(user.room).emit('turn', players[0].id);
}

//the players can chat after returning
const eliminated = eliminatedPlayers[user.room] || [];

const activePlayers = players.filter(player => !eliminated.includes(player.name));

    if (activePlayers.length > 0 && currentRound[user.room]) {
        currentTurn[user.room] = 0;
        io.to(user.room).emit('turn', activePlayers[0].id);
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

socket.on('message', (data) => {
    const room = data.room;
    const user = getUser(socket.id);

    if (!user) return;

    // 1. Block eliminated players
    if (eliminatedPlayers[room]?.includes(user.name)) {
        console.log('Eliminated player cannot chat:', user.name);
        return;
    }

    // 2. Get only active players
    const eliminated = eliminatedPlayers[room] || [];

    const activePlayers = getuserInRoom(room).filter(
        player => !eliminated.includes(player.name)
    );

    if (activePlayers.length === 0) return;

    // 3. Check whose turn it is
    const currentPlayer = activePlayers[currentTurn[room]];

    if (!currentPlayer || socket.id !== currentPlayer.id) {
        return;
    }

    // 4. Send the message to everyone in the room
    io.to(room).emit('message', buildMsg(data.name, data.text));

    // 5. Move to the next active player
    currentTurn[room]++;

    if (currentTurn[room] >= activePlayers.length) {
        currentTurn[room] = 0;
    }

    io.to(room).emit('turn', activePlayers[currentTurn[room]].id);
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
    const eleminated = eliminatedPlayers[room] || [];

    if(eleminated.includes(user.name)){
        console.log('eleminated player cannote: ', user.name);
        return;
    }

    if (!votingReady[room]) {
        votingReady[room] = new Set();
    }
 votingReady[room].add(user.name);
    const activePlayers = getuserInRoom(room).filter(
        player=> !eleminated.includes(player.name)
    );
    console.log(`Voting ready: ${votingReady[room].size}/${activePlayers.length}`);

if (activePlayers.length > 1 && votingReady[room].size === activePlayers.length){
        io.to(room).emit('startVoting');
        delete votingReady[room];
    }
});


//get player for voting page
socket.on('getVotingPlayers', ({room, playerName}) => {
console.log('Room received for voting:', room);
console.log('current voter:', playerName);

 socket.data.playerName = playerName;

socket.join(room);

//to block the eliminated player from voting
    const players = getuserInRoom(room).filter(
        user => user.name !== eliminatedPlayers[room]
    );

   // console.log("Voting players:", players.map(user => user.name));
     votingPlayers[room] = players;

    socket.emit('votingPlayers', {
        users: players,
        voterName: playerName
    });
});

    socket.on('leaveVotingRoom', (room) => {
    socket.leave(room);
    console.log(`Voting socket left room: ${room}`);
});


// received voting player from the voting page
socket.on('votePlayer', ({ playerId, playerName, room }) => {
    // Identify the player using the name saved for this voting page
    const voterName = socket.data.playerName;

    if (!voterName || !room) {
        console.log('Unknown voter');
        return;
    }

    // Make sure this player is registered in the voting roster
    const voter = votingPlayers[room]?.find(
        user => user.name === voterName
    );

    if (!voter) {
        console.log('Unknown voter:', voterName);
        return;
    }

    if (!votes[room]) {
        votes[room] = {};
    }

    if (!voters[room]) {
        voters[room] = new Set();
    }

    // Prevent the same player from voting twice
    if (voters[room].has(voterName)) {
        console.log('This player has already voted:', voterName);
        return;
    }

    // Prevent self-voting
    if (playerId === voter.id) {
        console.log('Self-voting is not allowed:', voterName);
        return;
    }

    // Validate the selected player
    const target = votingPlayers[room].find(
        user => user.id === playerId
    );

    if (!target || eliminatedPlayers[room]?.includes(target.name)) {
        console.log('Invalid voting target');
        return;
    }

    // Record the vote
    voters[room].add(voterName);
    votes[room][playerId] = (votes[room][playerId] || 0) + 1;

    console.log(
        `Votes received in ${room}: ${voters[room].size}/5`
    );

    // Finish after all five unique players vote
const activePlayers = getuserInRoom(room).filter(
    user => !eliminatedPlayers[room]?.includes(user.name)
);
    if (voters[room].size ===  activePlayers.length) {
        let eliminatedPlayer = null;
        let highestVotes = 0;

        for (const id in votes[room]) {
            if (votes[room][id] > highestVotes) {
                highestVotes = votes[room][id];
                eliminatedPlayer = id;
            }
        }

        const player = votingPlayers[room].find(
            user => user.id === eliminatedPlayer
        );

        if (!player) return;

        if (!eliminatedPlayers[room]){
            eliminatedPlayers[room]= [];
        }

        eliminatedPlayers[room].push(player.name);

        io.to(room).emit('votingResult', {
            playerName: player.name,
            votes: highestVotes
        });

        let seconds = 5;

        const timer = setInterval(() => {
            io.to(room).emit('countdown', seconds);
            seconds--;

            if (seconds < 0) {
                clearInterval(timer);
            }
        }, 1000);
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
//adding chat rounding helper functionality
function getNextActivePlayer(room, currentPlayerId) {
    const eliminated = eliminatedPlayers[room] || [];
    const activePlayers = getuserInRoom(room).filter(user => !eliminated.includes(user.name));
    if (activePlayers.length === 0) {
        return null;
    }

    const currentIndex = activePlayers.findIndex(user => user.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex];
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