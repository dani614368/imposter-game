const socket = io('http://localhost:8080');

const playersList = document.querySelector('.players-list');
const voteButton = document.querySelector('#voteButton');

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

    const selectedPlayer = document.querySelector(
        'input[name="vote"]:checked'
    );

    if (!selectedPlayer) {
        alert('Please select a player');
        return;
    }

     const playerId = selectedPlayer.value;
    console.log('Voting for:', selectedPlayer.value);

   socket.emit('votePlayer', {
        playerId: playerId
    });
});