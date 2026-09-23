const socket = io('http://localhost:8080');


const msgInput = document.querySelector('#msgInput');
const nameInput = document.querySelector('#name');
const GameRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');
const secretWord = document.querySelector('.secret-word');


socket.on('secretWord', ({word}) => {
    secretWord.textContent = `Your secret word: ${word}`;
});


function sendMessage(e){
    e.preventDefault();

        if (nameInput.value && msgInput.value && GameRoom.value){
        socket.emit('message', {
            name : nameInput.value,
            text : msgInput.value
        });
        msgInput.value = "";
    }
}

function enterRoom(e) {
    e.preventDefault();
    
    if (nameInput.value && GameRoom.value) {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: GameRoom.value
        }); 
    }
}

//for listner
document.querySelector('.form-msg')
        .addEventListener('submit', sendMessage);

document.querySelector('.join-Game')
    .addEventListener('submit', enterRoom);

     
msgInput.addEventListener('keypress', ()=>{
        socket.emit('activity', nameInput.value);
});


//listen for message
socket.on('message', (message) => {
    activity.textContent = "";
    const { name, text, time } = message;
    const li = document.createElement('li');
    li.className = 'post';

if (name === nameInput.value) {
     li.className = 'post post--left';
  }

if (name !== nameInput.value && name !== 'admin') {
        li.className = 'post post--right';
    }

if (name !== 'admin') {
 li.innerHTML = ` <div class="post__header ${name === nameInput.value? 'post__header--use' : 'post__header--reply' }">
                    <span class="post__header--name">${name}</span>
                     <span class="post__header--time">${time}</span>
                  </div>
        <div class="post__text">${text}</div>`;
    } else {

        li.innerHTML = `<div class="post__text">${text}</div>`;
    }
    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});


let activitytimer;
socket.on('activity',(name)=>{
    activity.textContent = `${name} is typing...`

    //clear after 3 seconds
    clearTimeout(activitytimer);
    activitytimer = setTimeout(()=>{
        activity.textContent = "";
    },3000);
});

socket.on(`userList`, ({users})=>{
    showUsers(users);
});

socket.on(`roomList`, ({rooms})=>{
    showRooms(rooms);
});

function showUsers(users){
    usersList.textContent = '';
    if(users){
        usersList.innerHTML = `<em>users in ${GameRoom.value}: </em>`;
users.forEach((user) => {
    usersList.innerHTML += `<div>${user.name}</div>`;
});
    }
}





function showRooms(rooms){
    roomList.textContent = '';
    if(rooms){
        roomList.innerHTML = '<em>Active Rooms </em>';
        rooms.forEach((room, i)=>{
            roomList.textContent += `${room}`;
            if(rooms.length > 1 && i !== rooms.length - 1){
                roomList.textContent += ",";
            }
        });
    }
}