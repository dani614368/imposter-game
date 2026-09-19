const express = require('express');
const {Server} = require('socket.io');
const path = require('path');
const app = express();
//const port = process.env.PORT || 8080;

const server = app.listen(8080, function(){
    console.log('the server is runing on port 8080');
});


//static setup

app.use(express.static(path.join(__dirname, '../public')));


const io = new Server(server);

io.on('connection', function(socket){
    console.log('make socket conntact: ', socket.id);

//upon connection only to user
    socket.emit('message', 'wellcome to imposter game');

//upon connection to all other 
    socket.broadcast.emit('message',`user ${socket.id.substring(0, 5)} connected`);

//listening for message event
        socket.on('message',function (message){
            console.log('Receiveed: ',message);
            io.emit('message', `${socket.id.substring(0, 5)}: ${message}`);
        });

//whan user disconnect to other
        socket.on('disconnect', ()=>{
            socket.broadcast.emit('message',`user ${socket.id.substring(0, 5)} disconnected`);
        });

//listen for activity
        socket.on('activity', (name)=>{
            socket.broadcast.emit('activity',name);
        });

});