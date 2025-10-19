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
                id : true,
                phone : true
            }
        })

        // findUnique returns an object with the selected property 

        return usersId
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
                id : true,
                BankAccount : true,
            }
        })

        return organiserId
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
        ? { userId: EntityId.id }
        : { organisationId: EntityId.id };
        

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

export async function GivenEventIdSelectAccountAndBankFromOrganiser(EventId){
    // EventId is an id itself not the object
    let organiser = await prisma.event.findUnique({
        where : {
            id : EventId
        },
        select : {
            organiserId : true
        }
    })

    return await prisma.organiser.findUnique({
        where : {
            id : organiser.organiserId
        },
        select : {
            BankAccount : true ,
            Bank : true
        }
    })
}


export async function GivenIdSelectOrganiser(OrganiserId) {
    return prisma.organiser.findUnique({
        where : {
            id : OrganiserId
        }
    })
    
}

export async function ReturnTheTotalPriceOfTickets(UsersEventChoice) {
    // UsersEventChoice will have = { EventId , TicketType , Quantity }
    let { EventId , TicketType , Quantity } = UsersEventChoice
    let priceSelected =  TicketType.vip ? priceVip : priceNormal
    let EventPrice = await prisma.event.findUnique({
        where : {
            id : EventId
        } ,
        select : {
            [priceSelected] : true
        }
    })

    let numOfTicket = TicketQuantity || 1
    let price = EventPrice.priceNormal || EventPrice.priceVip
    // bc it will only have either one
    // and users can buy both vip // both normal not combination

    return numOfTicket * price
    
}

// creating advertisment
// the code 
// refresh token and access token 


export async function EventTableUpdate(EventTicketsBought){
    // whenever u use this function u have to check if the tickets are available first
    // so EventTicketsBought {eventId , Vip : true / false , NumOfTicketsBought}
    let {eventId , Vip , NumOfTicketsBought} = EventTicketsBought
    let EventUpdated;
    if (EventTicketsBought.Vip){
        // ie if it is vip then update availableVip
        EventUpdated = await prisma.event.update({
            data : {
                AvailableTicketsVip :   AvailableTicketsVip - 1
            } ,
            where :{
                AND : [
                    {id : eventId} ,
                    {AvailableTicketsVip : {gt : 0}}
                ]
                // there needs to be a single vip ticket inorder for it to be selected
            }
        })

        
    }

    else{
        // the event is not vip so update normal
        EventUpdated = await prisma.event.update({
            data : {
                AvailableTicketsNormal :   AvailableTicketsNormal- 1
            } ,
            where :{
                AND : [
                    {id : eventId} ,
                    {AvailableTicketsNormal: {gt : 0}}
                ]
                // there needs to be a single vip ticket inorder for it to be selected
            }
    })
    }


    if (EventUpdated){
        return EventUpdated
    } 
    
    else{
        console.log(`Event ${eventId} has been sold out.`);
        return null;
    }
}

