import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import {uploadEvent} from '../middlewares/multer.js';
import { myEvents, getEvents, createEvent, } from '../controllers/events.js';


const eventRouter = express.Router(); //creates a mini sub-application that you can attach routes to.

eventRouter.use(authenticateToken);

eventRouter.get('/',getEvents);//shows all the events created so far in the homepage
eventRouter.post('/my', myEvents); // gets the events the user has booked before for organize gets the events he created before 
eventRouter.post('/create',uploadEvent.single('eventPhoto'),  createEvent); //creates events for organizer


export default eventRouter;