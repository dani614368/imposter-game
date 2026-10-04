const socket = io('http://localhost:8080');

let hasVoted = false;

const playersList = document.querySelector('.players-list');
const voteButton = document.querySelector('#voteButton');

socket.on('votingResult', ({ playerName, votes }) => {
    voteResult.textContent = `Player with most votes: ${playerName} | Votes: ${votes}`;
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


   socket.emit('votePlayer', {
        playerId: playerId
    });
    hasVoted= true;
    voteButton.disabled = true;
});