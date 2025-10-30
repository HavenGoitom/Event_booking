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
    return await prisma.organiser.create({
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
        let organiserId = await prisma.organiser.findUnique({
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

export async function GivenEventIdReturnMerchantId(eventId){
    // the eventId will be given and u will return the merchant id

    let organiserIdObj = await prisma.event.findUnique({
        where :{
            id : eventId
        },
        select : {
            organiserId : true
        }
    })

    return organiserIdObj?.organiserId ?  organiserIdObj.organiserId : 'Couldnt find the event sorry'
    
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
            userId : ProfilePicture.user ? EntityId.id : undefined,
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
    const { name, description, LocationOfEvent, AvailableTickets, priceNormal, priceVip, organiserId, advertismentImage, advertismentVideo } = EventAndAdvertisementInfo
    return await prisma.event.create({
        data : {
            name,          
            description ,     
            LocationOfEvent , 
            AvailableTicketsNormal : AvailableTickets.AvailableTicketsNormal , 
            AvailableTicketsVip : AvailableTickets.AvailableTicketsVip,
            priceNormal ,      
            priceVip  ,    
            advertisment : {
                create : {
                    advertisement_images: EventAndAdvertisementInfo.advertismentImage,
                    // advertisement_videos : EventAndAdvertisementInfo.advertismentVideo
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


export async function GivenTransactIdReturnEventInfo(transactionId){

}


export async function GivenEventIdUpdateTicketNum(event_Id , numberOfTickets , isTicketVip) {
    // then select the event and update it

    if (isTicketVip){
        await prisma.event.update({
            where : {
                id : event_Id,
            },
            data : {
                AvailableTicketsVip : {
                    decrement : numberOfTickets
                }
            }
        })
    }

    else{
        // if it is normal
        await prisma.event.update({
            where : {
                id : event_Id,
            },
            data : {
                AvailableTicketsNormal : {
                    decrement : numberOfTickets
                }
            }
        })
    }
 
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
    // UsersEventChoice will have = { EventId , TicketType = {vip : true} , Quantity }
    let { EventId , TicketType , Quantity } = UsersEventChoice
    let EventPrice = await prisma.event.findUnique({
        where : {
            id : EventId
        } ,
        select : {
            priceNormal : true,
            priceVip : true

        }
    })

    let numOfTicket = Quantity || 1
    let price =  TicketType.vip ? EventPrice.priceVip : EventPrice.priceNormal
    // bc it will only have either one
    // and users can buy both vip // both normal not combination

    return numOfTicket * price
    
}

// creating advertisment
// the code 
// refresh token and access token 



// i need a func to return the numen of available tickers


export async function ReturnTheNumOfTicketsAvailable(eventId){
    // they need to be returned the obj with vip and normal tickets

    let AvailTickets = await prisma.event.findUnique({
        where : {
            id : eventId,
        } , 
        select : {
            AvailableTicketsNormal : true,
            AvailableTicketsVip : true,
        }
    })

    return AvailTickets
}


export async function EventTableUpdate(EventTicketsBought){
    // whenever u use this function u have to check if the tickets are available first
    // so EventTicketsBought {eventId , Vip : true / false , NumOfTicketsBought}
    let {eventId , Vip , NumOfTicketsBought} = EventTicketsBought
    let EventUpdated;


   
    if (Vip){
        // ie if it is vip then update availableVip
        EventUpdated = await prisma.event.update({
            data : {
                AvailableTicketsVip :   { decrement: NumOfTicketsBought }
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
                AvailableTicketsNormal :   { decrement: NumOfTicketsBought }
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


export async function CreateTransaction(TransactionInfo){
    let {eventId , ticketType , numberOfTicketsBought , transactionId } = TransactionInfo;

    await prisma.transaction.create({
        data : {
            event : {
                connect : {
                    id : eventId // connect the transaction to the event
                }
            },
            ticketType,
            numberOfTicketsBought,
            transactionId
        }
    })
}


export async function GivenTransactionIdReturnEvent(transactionId) {
    let obj = await prisma.transaction.findUnique({
        where : {
            transactionId,  
        },
        select : {
            ticketType : true ,
            eventId : true,
            numberOfTicketsBought : true
        }
    })

    return obj
    
}export async function getAllEvents() {
}

export async function getEventsByOrganiser(organiserId) {
}

export async function getEventsByUser(userId) {
}

