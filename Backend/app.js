import express from 'express';
import authRouter from './routes/authRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import eventRouter from './routes/eventRoutes.js';
import dotenv from 'dotenv';
import path from 'path';
import cors from "cors";


dotenv.config(); //loads env variables

const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.json()); //parsing JSON
//app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))); //path.join(process.cwd(), 'uploads') builds the absolute filesystem path to the uploads directory (safe across OSes)



app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/events', eventRouter)
const PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`)
})