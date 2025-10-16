import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();
console.log(prisma)

// to update the database we will do CRUD operations

// so when a user sends information 

// so user will submit some information

async function CreateUser(UserInfo) {
    // so the backend will send stringified obj of usersInfo
    let userCreate = await prisma.user.create({
        data : UserInfo
        // the structure of user info need to match up the models info
    })

    return userCreate;
    // console.log(on the terminal)
    
}

async function Createorganiser(organiserInfo) {
    // backend will send the stringified info abt the organiser
    return await prisma.organizer.create({
        data : organiserInfo
    })
}


// when the user logs in

async function GivenEmailSelectTheUser(Info){
    // first you check the button if it is enabled then organiser else not - front end stuff
    // info will have structure {user : true , organiser : false , Email : email}

    if (Info.user){
        // ie it is a user
        let usersId = await prisma.user.findUnique({
            where : {
                email : Info.Email
            } ,
            select : {
                id : true
            }
        })

        // findUnique returns an object with the selected property 

        return usersId?.id
        // if it is not null
    }

    // include is for related tables

    else if (Info.organiser){
        // ie it is organizer 
        let organiserId = await prisma.organizer.findUnique({
            where : {
                email : Info.Email
            } ,
            select : {
                id : true
            }
        })

        return organiserId?.id
    }


}

// updating a profile

// when u update a profile
// u need to first see if it is a user or an organizer
// so given an email u need to query both the user and the organizer
// to avoid that 2 times querying everything u send from the front end needs to have 
async function CreateAndUpdateProfile(ProfilePicture) {
    // ProfilePicture = {user : true , organiser : false , Email : email , profile : url_of_the_profile}
         
    let EntityId = await GivenEmailSelectTheUser(ProfilePicture);
    // then we will have an id then we will create the profile and set it
    // so if the Entity is a user or organizer


    const whereClause = ProfilePicture.user
        ? { userId: EntityId }
        : { organisationId: EntityId };
        

    // upsert function is something that if the user exists then it will update it else if the user dont exist it will create it 
        
    await prisma.profilePicture.upsert({
        where : whereClause,
        // since the user is using userId and organisationId
        create : {
            userId : ProfilePicture.user ? EntityId : undefined,
            organisationId : ProfilePicture.organiser ? EntityId : undefined,
            picture : ProfilePicture.profile
        } ,

        update : {
            picture : ProfilePicture.profile
        }

    })



}


// creating an event
async function CreateEvent(EventInfo){
    // EventInfo = {name , description , Location , AvailableTicket , normalprice , vipPrice }             String
    // but an event is dependent on an organiser
    // so when 
    // EventInfo needs to be structured like the model and will have the email of the organiser
    // let organiserId = await GivenEmailSelectTheUser(EventInfo);
    
    // EventInfo['organiserId'] = organiserId; since many to many we dont need this
    return await prisma.event.create({
        data : EventInfo
    })
    

}


// creating advertisment
// the code 
// refresh token and access token 
// 
