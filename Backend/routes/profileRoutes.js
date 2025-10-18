import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
const authRouter = express.Router(); //creates a mini sub-application that you can attach routes to.


authRouter.use(authenticateToken); // all routes below are protected
authRouter.get("/profile", getProfile);
authRouter.post("/update", updateProfile);

export default authRouter