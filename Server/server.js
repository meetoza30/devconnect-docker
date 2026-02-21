import {createServer} from 'http';
import initializeSocket from "./src/utils/sockets.js";
import connectDB from "./src/config/db.js";
import app from "./app.js";

const server = createServer(app);

initializeSocket(server);
connectDB()

.then(()=>{
    console.log("Connected to DB")
    server.listen(4000, ()=>{
        console.log("Server is listening on port 4000")
    })
}
)
.catch((err)=>{
    console.error("DB connection isnt established")
})