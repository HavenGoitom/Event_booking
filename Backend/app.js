import express from 'express';
import authRouter from './routes/authRoutes.js';
import profileRouter from './routes/profileRoutes.js';
import eventRouter from './routes/eventRoutes.js';
import dotenv from 'dotenv';
import path from 'path';
import cors from "cors";
import paymentRoutes from './routes/paymentRoutes.js';



dotenv.config(); //loads env variables

const PORT = process.env.PORT || 3000
const app = express();

app.use(cors());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.json()); //parsing JSON


app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/events', eventRouter)


app.use('/api', paymentRoutes);
app.get('/', (req,res)=>res.send('API is up'));

// Global error handler (simple)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err });
});


app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`)
})