const { Server } = require('socket.io');
const User = require('../model/user.model');

async function getLiveUsers(socket, io) {
    try {
        socket.on('get-live-users', async () => {
            const liveUsers = await User.findAll({ attributes: ['twitchUsername'], where: { isLive: true } })
            const liveUrls = []
            if (liveUsers.length) {
                for (let i in liveUsers) {
                    const twitchUrl = `https://player.twitch.tv/?channel=${liveUsers[i].twitchUsername}&parent=fancy-valued-goat.ngrok-free.app`
                    liveUrls.push(twitchUrl)
                    console.log('liveUrls: ', liveUrls);
                }
                io.emit('live-users-update', { liveUrls });
            }
            else io.emit('live-users-updtae', { message: "no user found" })
        });
    } catch (error) {
        socket.emit("error", { message: "Error in Updating the location." })
    }
}

const mainFunction = (server) => {

    io = new Server(server, { cors: { origin: '*' } });

    io.on("connection", (socket) => {
        console.log('socket connected', socket.id);
        console.log(`A client connected. Total clients: ${io.engine.clientsCount}`);

        socket.on('get-live-users', (data) => {
            console.log('Received live users:', data);
        });
        
        socket.on('test', (data) => {
            console.log('Received test event:', data);
        });

        socket.on("disconnect", () => {
            console.log("socket disconnect", socket.id);
        });
    });
};
const getIo = () => io;
module.exports = {
    getIo,
    mainFunction
}