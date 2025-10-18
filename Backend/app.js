import express from 'express';
import authRouter from './routes/authRoutes.js';
import dotenv from 'dotenv';

dotenv.config(); //loads env variables

const app = express();
PORT = process.env.PORT || 3000

app.use(express.json()); //parsing JSON

app.use('/auth', authRouter);

app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`)
})