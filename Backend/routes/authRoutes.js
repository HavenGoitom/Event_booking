import express from 'express';
import {signup, login, refreshToken} from '../controllers/authController.js';
const authRouter = express.Router(); //creates a mini “sub-application” that you can attach routes to.

authRouter.post('/signup', signup);
authRouter.post('/login',login );
authRouter.post('/refresh-token', refreshToken)
// The front end will logout by removing the acess token from localStorage.removeItem('accessToken');


// authRouter.post('login',(req,res)=>{
//     res.send('user logged in!');
// })
export default authRouter;