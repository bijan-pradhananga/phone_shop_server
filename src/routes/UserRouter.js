const express = require('express')
const User = require('../controllers/UserController');
const userRouter = express.Router();
const bInstance = new User();

userRouter.post('/', bInstance.store);

module.exports =  userRouter;