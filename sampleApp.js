import express from 'express';
// import dotenv from 'dotenv';
// import cookieParser from 'cookie-parser';
// import rootRouter from './routes/root.js';
import { CreateUser, CreateAndUpdateProfile , Createorganiser , GivenEmailSelectTheUser , CreateEvent , GivenEventIdSelectEvent , GivenIdSelectOrganiser} from './DataBaseManipulation.js';

const app = express();

app.listen(3000 , () => {
    console.log('Server is up and running.');
})

app.get('/' , () => {
    CreateUser({
        name  : 'user1',
        email : 'user1@gmail.com',
        password : 'helloPPl'
    })
})