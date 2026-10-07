const socket = io('http://localhost:8080');

let hasVoted = false;

const playersList = document.querySelector('.players-list');
const voteButton = document.querySelector('#voteButton');
const countdown = document.querySelector('#countdown');
const voteResult = document.querySelector('#voteResult');


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


const params = new URLSearchParams(window.location.search);
const room = params.get('room');

console.log('Voting room:', room);

socket.on('connect', () => {

    console.log('Voting socket connected:', socket.id);
    console.log('Requesting players from room:', room);

    socket.emit('getVotingPlayers', room);
});

socket.on('votingPlayers', ({ users }) => {

    console.log('Received players:', users);

    playersList.innerHTML = '';

    users.forEach((user) => {

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