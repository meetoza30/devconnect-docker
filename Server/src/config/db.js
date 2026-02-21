import mongoose from "mongoose"
import 'dotenv/config'

const string = process.env.DB_URL
async function connectDB() {
    await mongoose.connect(string)
}



export default connectDB;


