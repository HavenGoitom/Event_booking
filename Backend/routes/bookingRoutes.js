import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import { bookEvent } from '../controllers/profilePicture.js';

const eventRouter = express.Router(); //creates a mini sub-application that you can attach routes to.

bookingRouter.use(authenticateToken);

eventRouter.post('/',bookEvent) // /book books an event

export default bookingRouter;