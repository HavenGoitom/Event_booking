import{PrismaClient}  from '@prisma/client';
// let = prismaModule;
 
// so generated/prisma uses commonjs module which has got a different way of exporting
// in commonJs u export using module.exports = {}
// and then u say require


const prisma = new PrismaClient();
console.log(prisma)

// to update the database we will do CRUD operations

// so when a user sends information 

// so user will submit some information

export async function CreateUser(UserInfo) {
    console.log('User info is passed and CreateUser is called')
    // so the backend will send stringified obj of usersInfo
    let userCreate = await prisma.user.create({
        data : UserInfo
        // the structure of user info need to match up the models info
    })

    return userCreate;
    // console.log(on the terminal)
    
}

export async function Createorganiser(organiserInfo) {
    // backend will send the stringified info abt the organiser
    return await prisma.organizer.create({
        data : organiserInfo
    })
}


// when the user logs in

export async function GivenEmailSelectTheUser(Info){
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

//  by id identify mareg events and organisers 

// updating a profile

// when u update a profile
// u need to first see if it is a user or an organizer
// so given an email u need to query both the user and the organizer
// to avoid that 2 times querying everything u send from the front end needs to have 
export async function CreateAndUpdateProfile(ProfilePicture) {
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
export async function CreateEvent(EventAndAdvertisementInfo){
    // EventInfo = {name , description , Location , AvailableTicket , normalprice , vipPrice }             String
    // but an event is dependent on an organiser
    // so when 
    // EventInfo needs to be structured like the model and will have the email of the organiser
    // let organiserId = await GivenEmailSelectTheUser(EventInfo);
    
    // EventInfo['organiserId'] = organiserId; since many to many we dont need this
    // since every advert is linked to an event use nested create
    return await prisma.event.create({
        data : {
            name,          
            description ,     
            LocationOfEvent , 
            AvailableTickets, 
            priceNormal ,      
            priceVip  ,    
            organiser ,
            advertisment : {
                create : {
                    advertisement_images: EventAndAdvertisementInfo.advertismentImage,
                    advertisement_videos : EventAndAdvertisementInfo.advertismentVideo
                }
            },
            organiser : {
                connect : {
                    // we use connect here bc the organiser must first exist to make an event post
                    id : EventAndAdvertisementInfo.organiserId
                    // this will be derived using the email and id matcher function
                }
            }
    }
})
    

}


export async function GivenEventIdSelectEvent(EventId){
    // so we can query the merchantid from the organiser table to make the transaction
    return prisma.event.findUnique({
        where : {
            id : EventId
        }
    })

    // it will return the whole event so the backend will have to take it 
    // and call the GivenIdSelectOrganiser(OrganiserId) bc an event can only be created by a single organiser
}


export async function GivenIdSelectOrganiser(OrganiserId) {
    return prisma.organiser.findUnique({
        where : {
            id : OrganiserId
        }
    })
    
}

// creating advertisment
// the code 
// refresh token and access token 

