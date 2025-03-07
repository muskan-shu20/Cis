const express = require('express');
const router = express.Router();
const controller = require('../controller/auth.controller')

router.get('/auth/twitch', controller.twitchAuth)
router.get('/auth/twitch/callback', controller.twitchCallback);
router.post('/twitch',controller.webHook);
router.get('/auth/user-details',controller.getUserDetails)


module.exports = router