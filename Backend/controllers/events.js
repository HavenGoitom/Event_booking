import path from 'path';
import { CreateEvent, getAllEvents, getEventsByOrganiser, getEventsByUser } from '../DataBaseManipulation.js';
import {ReturnTheTotalPriceOfTickets , GivenEmailSelectTheUser , GivenEventIdSelectAccountAndBankFromOrganiser ,  EventTableUpdate , ReturnTheNumOfTicketsAvailable} from '../DataBaseManipulation.js'
import { prisma } from '../prismaClient.js';

//gets all events
export const getEvents = async (req,res) => {
  try {
    const events = await getAllEvents()

    if (!events || events.length === 0) {
      return res.status(404).json({ message: 'No events found!!!' });
    }

    return res.status(200).json({
      message: 'Events fetched successfully',
      data: events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}


//creates an event for organizer only.

// controllers/events.js (only the createEvent function updated)
export const createEvent = async (req, res) => {
  try {
    const {
      email,
      name,
      description,
      LocationOfEvent,
      AvailableTicketsNormal,
      AvailableTicketsVip,
      priceNormal,
      priceVip,
      eventPhoto, // not used directly because we get file from req.file
    } = req.body;

    if (
      !email ||
      !name ||
      !description ||
      !LocationOfEvent ||
      !AvailableTicketsNormal ||
      !AvailableTicketsVip ||
      !priceNormal ||
      !priceVip
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // file must be present (uploadEvent.single('eventPhoto') should have run)
    if (!req.file) {
      return res.status(400).json({ message: 'Missing event photo' });
    }

    // find organiser
    const organiser = await prisma.organiser.findUnique({ where: { email } });
    if (!organiser) return res.status(404).json({ message: 'Organizer not found' });
    const organiserId = organiser.id;

    // Build the stored path and the full public URL (absolute). Do this AFTER filename exists.
    const filename = req.file.filename ?? path.basename(req.file.path);
    // relative path that matches your express.static mount
    const relativePath = path.posix.join('/uploads', 'eventPhoto', filename);
    // absolute public URL (what the frontend can fetch)
    const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    // Save the full URL into the DB (Option B)
    const events = await CreateEvent({
      name,
      description,
      LocationOfEvent,
      AvailableTicketsNormal,
      AvailableTicketsVip,
      priceNormal,
      priceVip,
      organiserId,
      // store the public URL so GET requests don't need to transform it
      picturePath: fullUrl,
      // If your DB schema expects an advertisement object instead, change accordingly:
      // advertisment: { advertisement_images: fullUrl }
    });

    return res.status(201).json({ message: 'created', url: fullUrl, event: events });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Displays events the user has booked so far and the events the organizer has organized so far.

export const myEvents = async (req, res) => {
  try {
    const { role, email } = req.body; 

    if (!role || !email) {
      return res.status(400).json({ 
        message: 'Missing required URL parameters: role and email are required' 
      });
    }
    
    if (role === 'org') {
      // events the organiser created
      const organiser = await prisma.organiser.findUnique({where: {email: email}})
      if(!organiser) return   res.status(404).json({message: 'email is not correct'})   
      const events = await getEventsByOrganiser(organiser.id)
      if (!events || events.length === 0) return res.status(404).json({ message: 'No events found' });
      return res.status(200).json(events);

    } else if (role === 'user') {
      // events the user booked 
      const user = await prisma.user.findUnique({where: {email: email}})
      if(!user) return   res.status(404).json({message: 'email is not correct'})   
      const userEvents = await getEventsByUser(user.id)
      if (!userEvents || !userEvents.length === 0) return res.status(404).json({ message: 'No booked events found' });
      return res.status(200).json(userEvents);

    } else {
      return res.status(400).json({ message: 'Role is not supported' });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// books an event and communicate with arifPay


// 256-bit nonce, base64url without padding  -> this is a nonce generator


function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateNonce() {
  const bytes = crypto.randomBytes(32); // 32 bytes = 256 bits
  return base64url(bytes); // URL-safe string
}

// so the frontend will send this information
// the users phone , email , nonce , paymentMethods , items , lang =  'EN' , cancelUrl , errorUrl , notifyUrl , successUrl , expireDate , beneficiaries 
// so to access this u will use email to find users phone 
// nonce is generated
// paymentMethods , lang = 'EN' , cancelUrl , errorUrl , notifyUrl , successUrl  are unchanging 
//  expireDate will be set to be 20 min + new Date().now()
//  , beneficiaries -> using the events id we will query the events table and locate the organisers id and then select the bank account and merchant id to send to arif pay server

async function ProperDataArrangement(FrontEndSentInfo){
    // FrontEndSentInfo = {
    // email , items : {
    // EventId , TicketType : vip / normal , TicketQuantity}
    // }
    
    // vip is not defined
    let {email , items} = FrontEndSentInfo

    // first u need to check if the tickets are available
    let AvailableTickets = await ReturnTheNumOfTicketsAvailable(items.EventId);

    if (!(Vip && (AvailableTickets.AvailableTicketsVip < items.TicketQuantity) )){
        return "There is no available vip ticket"
    }

    if (!Vip && (AvailableTickets.AvailableTicketsNormal < items.TicketQuantity) ){
        return "There is no normal ticket left"
    }

    // we will need usersPhone
    let userInfo = await GivenEmailSelectTheUser({user : true , organiser : false , Email : email});
    // do we need await here?
    // userInfo = {id , phone} -> in a proper structure
    // email will be received from the FrontEndSentInfo

    let totalMoney = await ReturnTheTotalPriceOfTickets(items)
    // is it number?

    let expireDate = new Date( Date.now() + 20 * 60 * 1000).toISOString()
    // the payment will expire after 20 minutes

    // how tp generate the nonce -> probably in the backend
    // if this works properly then make the user select different tickets and pay all at once

    // select the organisers id and their acccount
    let BeneficiaryInfo = await GivenEventIdSelectAccountAndBankFromOrganiser(items.EventId);
    // BeneficiaryInfo = {Bank : sthg , BankAccount : Sthg}


    const payload = {
        cancelUrl : 'nfjj',// link of a frontend page 
        NotifyUrl : 'nfjj',// link where the arif pay server will send the response obj 
        successUrl : 'nfjj',// link of a frontend page
        errorUrl : 'nfjj',// link of a frontend page
        phone : userInfo.phone ,
        email , // bc the FrontEndSentInfoWillhaveit
        nonce : generateNonce(),// generated by something from the frontend
        paymentMethods : ["TELEBIRR"], // temporarily telebirr
        expireDate ,
        items  ,// is that neccessary ?
        lang : 'EN' ,
        beneficiaries : [
            {
                accountNumber : BeneficiaryInfo.BankAccount,
                bank : BeneficiaryInfo.Bank,
                amount : totalMoney
            }
        ]

    }


    console.log(payload)

    return {payload , items} ;

    

    
}


export const arifPayFunction =  async (req , res) => {
    // this is where u will recive the request to payment and you talk to arifpay server

    let properData = await  ProperDataArrangement(req.body)

if (properData === 'There is no available vip ticket'  || properData === 'There is no normal ticket left')
  {
        return "The payment cant be processed because of lack of ticker"
    }
    

    // then send the info to arifpay server
    const responseObj = await axios.post(
        `${process.env.ARIFPAY_BASE_URL}/checkout/session`,
        properData.payload ,
        {
            headers : {
                'x-arifpay-key' : `${process.env.ARIFPAY_API_KEY}`,
                // u need the api key to identify urself as a valid request maker
                'Content-Type' : 'application/json'
            } , 
            timeout : 20000
        }
    )



    let ArifpayReceivedAndimp = {
        // write this in a response body
        sessionId : responseObj.data.data.sessionId ,
        // used to verify transaction using session id
        checkoutUrl : responseObj.data.data.paymentUrl,

        status : responseObj.data.data.status

    }

    if (Number(ArifpayReceivedAndimp.status) === 200){
        // if the arif pay server has properly sent some data
        // then update the Events table
        // we need to know the ticket type of the user

        // so EventTicketsBought {eventId , Vip : true / false , NumOfTicketsBought}
        let EventToUpdateInfo = {
            eventId : items.EventId , 
            Vip : items.TicketType === 'vip' ? true : false ,
            NumOfTicketsBought : Number(items.TicketQuantity)
        }
        
        await  EventTableUpdate(EventToUpdateInfo);


    }


}

// once the transaction is confirmed from the web hook we will update the events table by the number of tickets bought 



export const  arifPayTransfer =
        async (request , response) => {
            try{
                const { Sessionid , PhoneNumber } = request.body || {};

                if (!Sessionid || !PhoneNumber){
                    return response.status(400).json({
                        message : "Session id and phone number are required"
                    })
                }

                // check the phone number starts with valid values 
                if (!/^251\d{9}/.test(PhoneNumber)){
                    return response.status(400).json({
                        message : "The phone number is not in the correct 2519XXXXXXXXX or 2517XXXXXXXXXX "
                    })
                }

                const payLoad = {Sessionid , PhoneNumber};

                const responseObj = await axios.post(`${process.env.ARIFPAY_BASE_URL}/Telebirr/b2c/transfer` ,
                    payLoad , 
                    {
                        headers : {
                            "x-arifpay-key" : process.env.ARIFPAY_API_KEY ,
                            "Content-Type" : "application/json",
                        },
                        timeout : 20000 ,
                    }
                );

                return response.json(responseObj.data);

            } catch(error) {
                console.error("[telebrr/transfer]" , error.response?.data ||  error.message)
                // the error obj have got either message or response attribute
                // console.error() is like console.log but signifies that it is error
                // console.error() takes a bunch of messages and just prints them in order
            }
        }

