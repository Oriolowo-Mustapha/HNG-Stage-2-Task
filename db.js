const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
const connectDb = async () =>{
    try{
        console.log("Attempting to connect to MONGODB....")
        await mongoose.connect(MONGO_URI)
        console.log("Connected To MONGO_DB Successfully")
    } catch (error){
        console.log("Error connecting to MONGO_DB: ", error.message || error)
        process.exit(1)
    }
};
module.exports = connectDb