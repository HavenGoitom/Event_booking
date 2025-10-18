import express from 'express';
import authRouter from './routes/authRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import eventRouter from './routes/eventRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config(); //loads env variables

const app = express();
app.use(express.json()); //parsing JSON
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))); //path.join(process.cwd(), 'uploads') builds the absolute filesystem path to the uploads directory (safe across OSes)



app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/events', eventRouter)
app.use('/book', bookingRouter)
PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`)
})