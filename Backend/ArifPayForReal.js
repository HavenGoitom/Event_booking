import axios from "axios";
import moment from 'moment';
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { GivenEventIdUpdateTicketNum , GivenTransactionIdReturnEvent , CreateTransaction,
  GivenEventIdReturnMerchantId , ReturnTheTotalPriceOfTickets , GivenEmailSelectTheUser ,
   GivenEventIdSelectAccountAndBankFromOrganiser ,  EventTableUpdate , 
   ReturnTheNumOfTicketsAvailable} from './DataBaseManipulation.js'
// 256-bit nonce, base64url without padding  -> this is a nonce generator
import crypto from 'crypto'; // used for nonceGeneration to prevent hackers replay man attacks
dotenv.config();
let app = express();


// bc we will update the tables status



function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateNonce() {
  const bytes = crypto.randomBytes(32); // 32 bytes = 256 bits
  return base64url(bytes); // URL-safe string
}

// so the frontend will send this information
// nonce - generated in the backend
// the users phone , email , nonce , paymentMethods , items , lang =  'EN' , cancelUrl , errorUrl , notifyUrl , successUrl , expireDate , beneficiaries 
// so to access this u will use email to find users phone 
// nonce is generated
// paymentMethods , lang = 'EN' , cancelUrl , errorUrl , notifyUrl , successUrl  are unchanging 
//  expireDate will be set to be 20 min + new Date().now()
//  , beneficiaries -> using the events id we will query the events table and locate the organisers id and then select the bank account and merchant id to send to arif pay server


// generating the transactionId - using userId + eventId + date + bankacccount + amount
// u need sthg unique per payment attempt not only per logic
// confused a bit abt idempotency but still lets make it 


function generateTransactionId(userId , eventId , amount){
  // to track the transaction and prevent idempotency
  let MomentObj = moment(new Date());
  // having moment makes it easier to work with dates
  // so lets format the date in a proper way to make it fit YYYY-MM-DD HH -> so the user wont do a transaction in the same hr
  let TimeofTransaction = MomentObj.format('YYYY-MM-DD_HH-mm');
  // this will return the day and hr + min

  let transId = `TXN_${TimeofTransaction}_${userId}_${eventId}_${amount}`
  // do i need to have items ready ?
  // items is an array of items objects

  // so that will be the idempot
  return transId;


}
// when generating a transaction Id only having the time stamp is not ok
// so u need the transactionId to resemble the same logic
// so make the date , bankAccount and the amount


// so first u send the data collected to the arif pay server including the payload
// arif pay will return transactionId , redirectUrl - where to redirect the user , status - if the checkout session is created successfully
// then u will redirect the to the redirectUrl
// once the arif pay server is done processing the transaction
// it will send a post request to ur notify url
// transactionId , status , amount , paymentMethod ..
// then when u receive the success message u will decrement the number of tickets
// more advanced u will do a transaction verifcation


async function ProperDataArrangement(FrontEndSentInfo){
    // FrontEndSentInfo = {
    // email , items : {
    // EventId , TicketType : vip / normal , TicketQuantity}
    // }
    
    // vip is not defined
    let {email , items} = FrontEndSentInfo

 
    let Vip;
    if (items.TicketType === 'vip'){
        Vip = true;
    }

    // first u need to check if the tickets are available
    let AvailableTickets = await ReturnTheNumOfTicketsAvailable(items.EventId);

    if (Vip && (AvailableTickets.AvailableTicketsVip < items.TicketQuantity) ){
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

    // how to generate the nonce -> probably in the backend
    // if this works properly then make the user select different tickets and pay all at once

    // select the organisers id and their acccount
    let BeneficiaryInfo = await GivenEventIdSelectAccountAndBankFromOrganiser(items.EventId);
    // BeneficiaryInfo = {Bank : sthg , BankAccount : Sthg}

    let transactionId = generateTransactionId(userInfo.id , items.EventId , totalMoney)
    
    let merchant_id = await GivenEventIdReturnMerchantId(items.EventId);

    const payload = {
      merchant_id,
      cancelUrl : 'nfjj',// link of a frontend page - to be corrected later 
      notifyUrl : 'nfjj',// link where the arif pay server will send the webhook's response obj 
      successUrl : 'nfjj',// link of a frontend page
      errorUrl : 'nfjj',// link of a frontend page
      phone : userInfo.phone ,
      email , // bc the FrontEndSentInfoWillhaveit
      nonce : generateNonce(),// generated by something from the frontend
      paymentMethods : ["TELEBIRR"], // temporarily telebirr
      expireDate ,
      items  ,// the backend will prepare an array of item objects to send to the server
      lang : 'EN' ,
      beneficiaries : [
          {
            accountNumber : BeneficiaryInfo.BankAccount,
            bank : BeneficiaryInfo.Bank,
            amount : totalMoney
          }
      ],
      transactionId
        // u also need a transaction id here

    }


    console.log(payload)

    return {payload , items , transactionId} ; 
  }



// this will be called inside the route handler making the res and req like given arguments
export const arifPayFunction =  async (req , res) => {
  try{
    // this is where u will recive the request to payment and you talk to arifpay server

    let properData = await  ProperDataArrangement(req.body);
    // the req.body will have to have the frontend info in the proper payload arrangment

    if (properData === 'There is no available vip ticket' || properData === 'There is no normal ticket left'){
        console.log("The payment cant be processed because of lack of ticker")
        return res.status(400).json({ message: properData })
    }

    let {payload , items , transactionId} = properData;
    let {EventId , TicketType , TicketQuantity} = items;

    

    // then send the info to arifpay server
    // initializing the payment session
    const responseObj = await axios.post(
        `${process.env.ARIFPAY_BASE_URL}/checkout/session`,
        payload ,
        {
            headers : {
                'x-arifpay-key' : `${process.env.ARIFPAY_API_KEY}`,
                // u need the api key to identify urself as a valid request maker
                'Content-Type' : 'application/json'
            } , 
            timeout : 20000
        }
    )

    // then generate a transaction 
    CreateTransaction({
      transactionId,
      eventId : EventId,
      ticketType :TicketType,
      numberOfTicketsBought : TicketQuantity
    })
    // this will create a transaction 


    // so u r making the connection to arif pay server
    // then it will send u where to be redirected 
    // it has successfully created the checkout session




    let ArifpayReceivedAndimp = {
        // write this in a response body
        sessionId : responseObj.data.data.sessionId ,
        // used to verify transaction using session id
        checkoutUrl : responseObj.data.data.paymentUrl,
        // where the users will be redirected to make their payment
        // send the customer to this page
        status : responseObj.data.data.status
        // it tells u if the payment done was successful or not

    }

    // we need to redirect the front end to the checkout url 
    res.status(200).json({
      checkoutUrl: ArifpayReceivedAndimp.checkoutUrl,
      sessionId: ArifpayReceivedAndimp.sessionId,
      status: ArifpayReceivedAndimp.status
    })
    // and in the front end u will do window.locatuon.href = response.data.checkoutUrl

    // is the status a number?

  }catch(error){
    const ArifError = error?.response?.data || error?.message || "Something wrong in the checkout session creation"
    console.log(ArifError)
    res.end(ArifError)
  }
    


}


// then u need to handle the post request made by the arif pay server ur notify url
// there needs to be a transaction table that contains the event id and transactionId and also the number of tickets bought
// so when the user gets redirected then i  need to save the transaction id
// and then when arif pays webhook responds with the success i go to the transaction table and update the status -> paid
app.post(`${process.env.NOTIFY_URL}` , 
  async (req , res) => {
    // then u do the request and response
    // the arif pay server will give u a req
    // when the server sends u confirmation that the payment is done then u do the update on the table
    // u need to confirm the amount paid is actually equal to the amount needed
    // i think the arif pay server does that bc else why wld u need to send the total amount

    // if the req sent has got like success then do the update and if the status is error then return it to the cancel / error url

    try{
      // get the sessionId and the phone number
      const {  transactionId ,  status , signature } = req.body || {};

      if (!transactionId || !status || !signature){
        console.log("transactionId = " , transactionId)
        console.log("status = " , status)
        console.log("signature  = " , signature )
        res.send('The payment success information is not properly sent from arif pays server.');
        res.end();
      }


      // check if it is really arif pay server doing the sending
      // if (signature !== process.env.ARIFPAY_WEBHOOK_SECRET){
      //   console.log("The signature sent by arif pays server is not the one expected.");
      //   console.log("signature received = " ,signature )
      //   console.log("ARIFPAY_WEBHOOK_SECRET = " , ARIFPAY_WEBHOOK_SECRET)
      //   res.status(400).send('Arif pay servers web hook secret has been different');
      //   // 400 - bad request
      //   return;
      // }  remove the webhook part

      else if (status.trim() === "success"){

        // if the incoming req is proper
        console.log("successfully paid");


        let EventInfo = await GivenTransactionIdReturnEvent(transactionId);

        let eventId =  EventInfo.eventId ;
        let numberOfTicketsBought =  EventInfo.numberOfTicketsBought;
        let typeOfTicket =  EventInfo.ticketType;
      
        // so update the transaction table status
        // and deduct the events ticket number
        let isTicketVip = typeOfTicket === 'vip' ? true : false;
        await GivenEventIdUpdateTicketNum(eventId , numberOfTicketsBought ,isTicketVip );
        // then access the event information



        
      }

      // then update the transactionId's status to paid 
      // 

    }catch (err) {
      console.log(err)
    }


    // when u get notified is when u do the update but where does the webhook secret fit in this ?
    // and also what abt the notify url?


  }
)






