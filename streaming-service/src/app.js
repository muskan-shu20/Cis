const express = require('express');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const sockets = require('./controller/socket.controller');
sockets.mainFunction(server); 
const PORT = process.env.PORT; 

app.use(express.json());
app.use(cors("*"));

app.get('/',(req,res)=>{
res.send("Gamersverse Server Running!!")
})

app.use('/api/v1', require('./routes/auth.routes'));
app.use('/webhook', require('./routes/auth.routes'));
app.use('/api/v1/streaming', require('./routes/streaming.routes'));



server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
