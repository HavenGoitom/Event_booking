import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import {uploadProfile} from '../middlewares/upload.js';
import { getProfile, createAndUpdateProfile } from '../controllers/profilePicture.js';

const profileRouter = express.Router(); //creates a mini sub-application that you can attach routes to.


profileRouter.use(authenticateToken); // all routes below are protected
profileRouter.get("/:role/:id", getProfile);
/*
it should have the same name as this in the frontend
<form action="/profile" method="post" enctype="multipart/form-data">
  <input type="file" name="profilePicture" />
</form>
upload.single('profilePicture') is a middleware that accepts one file and saves it in your /uploads folder
*/

profileRouter.post('/upload/:role', uploadProfile.single('profilePicture'), createAndUpdateProfile);

export default profileRouter