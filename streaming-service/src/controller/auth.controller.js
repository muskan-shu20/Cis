require('dotenv').config()
const axios = require('axios');
const User = require('../model/user.model')
const path = require('path')
const {getIo} = require("./socket.controller");

exports.twitchAuth = async (req, res) => {
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.TWITCH_REDIRECT_URI}&response_type=code&scope=user:read:email`;
    res.redirect(twitchAuthUrl);
}

exports.twitchCallback = async (req, res) => {
    const { code, scope } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }
    try {
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TWITCH_REDIRECT_URI,
            }
        });

        const accessToken = tokenResponse.data.access_token;
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const twitchUser = userResponse.data.data[0];
        console.log('twitchUser: ', twitchUser);
        const { id, display_name, email, profile_image_url } = userResponse.data.data[0];
        const userExists = await User.findOne({ where: { twitchId: twitchUser.id } })
        let newuser
        if (!userExists) {
             newuser = await User.create({
                twitchId: id,
                twitchUsername: display_name,
                isLive: false,
                twitchAccessToken: accessToken,
                email,
                image : profile_image_url
            })
            await subscribeToTwitchEvents(twitchUser.id)
        }
        const validUserId = userExists?userExists.userId:newuser?.userId
        res.redirect(`https://todocalc-8633c.web.app/home?userId=${validUserId}`)
        // res.sendFile(path.join(__dirname, '../public', 'index.html'));
    } catch (error) {
        console.error('Error linking Twitch:', error);
        res.status(500).json({ error: 'Failed to link Twitch account' });
    }
}
// subscribeToTwitchEvents('1270653197')
async function subscribeToTwitchEvents(twitchUserId) {
    try {
        const onlineSubscription = await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', {
            type: 'stream.online',
            version: '1',
            condition: { broadcaster_user_id: twitchUserId },
            transport: {
                method: 'webhook',
                callback: process.env.WEBHOOK_URL,
                secret: process.env.TWITCH_SECRET,
            }
        }, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
            }
        });
        
        const offlineSubscription = await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', {
            type: 'stream.offline',
            version: '1',
            condition: { broadcaster_user_id: twitchUserId },
            transport: {
                method: 'webhook',
                callback: process.env.WEBHOOK_URL,
                secret: process.env.TWITCH_SECRET,
            }
        }, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
            }
        });
        
        // console.log('data: ', data);
    } catch (error) {
        console.error('Error subscribing to Twitch events:', error);
    }
}
const data = getStreamInfo(1270653197)
async function getStreamInfo(userId) {
    console.log('userId: ', userId);
    try {
        const response = await axios.get('https://api.twitch.tv/helix/streams', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,  
                'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,  
            },
            params: {
                user_id: userId, 
            },
        });

        if (response.data.data.length > 0) {
            const streamInfo = response.data.data[0];
            console.log('Stream is live:', streamInfo);
            return streamInfo;
        } else {
            console.log('User is not live');
            return null;
        }
    } catch (error) {
        console.error('Error fetching stream info:', error.response ? error.response.data : error.message);
        return null;
    }
}


async function triggerLiveUserEvent() {
    const liveUsers = await User.findAll({ 
        attributes: ['twitchUsername','twitchId','profileImage'], 
        where: { isLive: true } 
    });
    const liveUrls = [];
    if (liveUsers.length) {
        for (let i in liveUsers) {  
            console.log('liveUsers: ', liveUsers);
            const streamInfo = await getStreamInfo(liveUsers[i].twitchId )
            const twitchUrl = `https://player.twitch.tv/?channel=${liveUsers[i].twitchUsername}&parent=fancy-valued-goat.ngrok-free.app&parent=todocalc-8633c.web.app&parent=localhost&parent=https://cis-0cz9.onrender.com`;
            const data = {
                twitchUrl,
                streamingId : streamInfo?.id,
                title: streamInfo?.title,
                startedAt : streamInfo?.started_at,
                thumbnail : streamInfo?.thumbnail_url,
                username : liveUsers[i]?.twitchUsername,
                viewers : streamInfo?.viewer_count,
                gameName : streamInfo?.game_name,
                twitchImage : liveUsers[i]?.profileImage
            }
            liveUrls.push(data);
        }
        io.emit('live-users-update', { data : liveUrls});
    } else {
        io.emit('live-users-update', { message: "No users found" ,data : []});
    }
}

exports.webHook = async (req, res) => {
    const { subscription, event, challenge } = req.body; //9a732cf0-0831-46e3-b7ea-0a9cf8b284c3
    const io = getIo();
    if (challenge) {
        console.log('challenge: ', challenge);
        return res.send(challenge); 
    }
    console.log('subscription: ', subscription);
    if (!event) {
        return res.sendStatus(200);
    }
    console.log('Twitch Event Received:', event);
    const isLive = subscription.type === 'stream.online' ? true : false ;
    await User.update({ isLive }, {
        where: { twitchId: event.broadcaster_user_id }
    });
    await triggerLiveUserEvent();
    res.sendStatus(200);
};


exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.query
        await triggerLiveUserEvent() 
        if (!userId) return res.send({ status: false, message: "user Id field is required" })
        const userDetails = await User.findOne({ where: { userId } })
        if (userDetails) {
            return res.send({ status: true, message: "success", data: userDetails })
        }
        return res.send({ status: "false", message: "user not found" })
    } catch (error) {
        console.log('error: ', error);
        return res.send({ status: "false", message: "error getting user details" })
    }
}

// deleteTwitchEventSubSubscription("9a732cf0-0831-46e3-b7ea-0a9cf8b284c3",process.env.TWITCH_ACCESS_TOKEN,process.env.TWITCH_CLIENT_ID)
// async function deleteTwitchEventSubSubscription(subscriptionId, accessToken, clientId) {
//     const url = `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`;
    
//     try {
//         // Make DELETE request to remove the EventSub subscription
//         const response = await axios.delete(url, {
//             headers: {
//                 'Client-ID': clientId,
//                 'Authorization': `Bearer ${accessToken}`,
//             },
//         });

//         if (response.status === 204) {
//             console.log('Subscription successfully deleted');
//         } else {
//             console.log(`Failed to delete subscription: ${response.statusText}`);
//         }
//     } catch (error) {
//         console.error('Error deleting subscription:', error);
//         throw error;
//     }
// }



        // twitchUser:  {
        //     id: '1259121425',
        //     login: 'muskancis',
        //     display_name: 'muskancis',
        //     type: '',
        //     broadcaster_type: '',
        //     description: '',
        //     profile_image_url: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/998f01ae-def8-11e9-b95c-784f43822e80-profile_image-300x300.png',
        //     offline_image_url: '',
        //     view_count: 0,
        //     email: 'muskan.shu@cisinlabs.com',
        //     created_at: '2025-02-17T11:58:44Z'
        //   }




// id: '314937861624',
// broadcaster_user_id: '1214277584',
// broadcaster_user_login: 'aaditya321321',
// broadcaster_user_name: 'aaditya321321',
// type: 'live',
// started_at: '2025-03-03T09:47:55Z'
