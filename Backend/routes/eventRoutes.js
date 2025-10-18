import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import {uploadEvent} from '../middlewares/upload.js';
import { createAndUpdateEventPhoto } from '../controllers/profilePicture.js';

const eventRouter = express.Router(); //creates a mini sub-application that you can attach routes to.

eventRouter.use(authenticateToken);

eventRouter.get('/');//shows all the events created so far in the homepage
eventRouter.get('/my/:userID'); // gets the events the user has booked before for organize gets the events he created before 
//myevents will be deleted after 15 days of the event
eventRouter.post('/create'); //creates events for organizer
eventRouter.post('/:eventId/photo', uploadEvent.single('eventPhoto'), createAndUpdateEventPhoto) // saves the event photo in the upload/eventPhoto
/*
it should have the same name as this in the frontend
<form action="/profile" method="post" enctype="multipart/form-data">
  <input type="file" name="profilePicture" />
</form>
upload.single('profilePicture') is a middleware that accepts one file and saves it in your /uploads folder
*/

export default eventRouter;