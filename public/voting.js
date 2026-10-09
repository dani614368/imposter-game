const socket = io('http://localhost:8080');

const params = new URLSearchParams(window.location.search);
const room = params.get('room');
const playerName = sessionStorage.getItem('playerName');

let hasVoted = false;

const playersList = document.querySelector('.players-list');
const voteButton = document.querySelector('#voteButton');
const countdown = document.querySelector('#countdown');
const voteResult = document.querySelector('#voteResult');


console.log('current player: ', playerName);
console.log('current room: ', room);

socket.on('votingResult', ({ playerName, votes }) => {
    voteResult.textContent = `Player with most votes: ${playerName} | Votes: ${votes}`;
});
socket.on('countdown', (seconds) => {
        countdown.textContent = `Returning to game in ${seconds} seconds...`;

    if (seconds === 0) {
        socket.emit('leaveVotingRoom', room);
        window.location.href = '/';
    }
});





console.log('Voting room:', room);

socket.on('connect', () => {

    console.log('Voting socket connected:', socket.id);
    console.log('Requesting players from room:', room);

    socket.emit('getVotingPlayers', {
        room: room,
        playerName: sessionStorage.getItem('playerName')
    });
});

socket.on('votingPlayers', ({ users, voterName }) => {

    console.log('Received players:', users);
    console.log('current voter:', voterName);

    playersList.innerHTML = '';

    users.forEach((user) => {
        if(user.name === voterName){
            return;
        }

        playersList.innerHTML += `
            <label class="player-card">
                <input 
                    type="radio" 
                    name="vote" 
                    value="${user.id}"
                >
                <span>${user.name}</span>
            </label>
        `;

    });

});

voteButton.addEventListener('click', () => {

if(hasVoted){
    return;
}


    const selectedPlayer = document.querySelector(
        'input[name="vote"]:checked'
    );

    if (!selectedPlayer) {
        alert('Please select a player');
        return;
    }

     const playerId = selectedPlayer.value;
const playerName = selectedPlayer.nextElementSibling.textContent;

   socket.emit('votePlayer', {
        playerId: playerId,
        playerName: playerName,
        room: room
    });
    hasVoted= true;
    voteButton.disabled = true;
});