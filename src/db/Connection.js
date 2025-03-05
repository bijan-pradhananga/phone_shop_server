const mongoose = require('mongoose')

class Connection{
    constructor(){
        try {
            mongoose.connect(process.env.MONGO_URI);
            console.log('connected to db');
        } catch (error) {
            console.log('error while connecting to db');
            console.log(error);
        }
    }
}

module.exports = Connection