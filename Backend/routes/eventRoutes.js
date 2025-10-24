import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import {uploadEvent} from '../middlewares/multer.js';
import { myEvents, getEvents, createEvent } from '../controllers/events.js';

const eventRouter = express.Router(); //creates a mini sub-application that you can attach routes to.

eventRouter.use(authenticateToken);

eventRouter.get('/',getEvents);//shows all the events created so far in the homepage
eventRouter.get('/my', myEvents); // gets the events the user has booked before for organize gets the events he created before 
eventRouter.post('/create',uploadEvent.single('eventPhoto'),  createEvent); //creates events for organizer


/*
When posting from a browser form, ensure:
Form enctype="multipart/form-data" OR
When using fetch, send a FormData object:
const form = new FormData();
form.append('name', 'Music Fest');
form.append('eventPhoto', fileInput.files[0]);
await fetch('/api/events/create', { method: 'POST', body: form });

it should have the same name as this in the frontend
<form action="/profile" method="post" enctype="multipart/form-data">
  <input type="file" name="profilePicture" />
</form>
upload.single('profilePicture') is a middleware that accepts one file and saves it in your /uploads folder
*/
// POST /api/events/:id/book   -> book the event with event is
//eventRouter.post('/:id/book', bookEvent);


export default eventRouter;