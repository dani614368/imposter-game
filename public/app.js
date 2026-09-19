const socket = io('http://localhost:8080');


const activity = document.querySelector('.activity');
const msgInput = document.querySelector('#msgInput');


function sendMessage(e){
    e.preventDefault();
        

    if(msgInput.value){
        socket.send(msgInput.value);
        msgInput.value = "";
    }
}

document.querySelector('form')
        .addEventListener('submit', sendMessage);

socket.on('message', (message)=>{
  activity.textContent = "";
    const li = document.createElement('li');
    li.textContent = message;
    document.querySelector('ul').appendChild(li);
});



msgInput.addEventListener('keypress', ()=>{
        socket.emit('activity', socket.id.substring(0, 5));
});

let activityTimer;
socket.on('activity', (name)=>{
    activity.textContent = `${name} is typing...`

    clearTimeout(activityTimer);
        activityTimer = setTimeout(() =>{
            activity.textContent = "";
        }, 3000);
        
});