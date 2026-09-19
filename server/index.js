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

        socket.on('message',function (message){
            console.log('Receiveed: ',message);
            io.emit('message', `${socket.id.substring(0, 5)}: ${message}`);
        });
});