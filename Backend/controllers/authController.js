import {CreateUser, Createorganiser} from '../DataBaseManipulation.js';
import { prisma } from '../prismaClient.js';
import { generateTokens } from '../utils/generateTokens.js';
import bcrypt from 'bcrypt';

//to use prisma

import dotenv from 'dotenv';
dotenv.config();

export const login = async (req,res) => {
  try{
    const role = req.body.role
    if (!role) {
        return res.status(400).json({ message: 'Role is required' });
    }
    const {email, password} = req.body;
    if (role == 'org'){
      const orgExists =await prisma.organiser.findUnique({where: {email: email}})
      if(!orgExists){
        return res.status(400).json({message: 'Email does not exist'})
      }else{
        const isMatch = await bcrypt.compare(password, orgExists.password)
        if(isMatch) {
          const tokens = generateTokens(orgExists); 
          return res.status(200).json({
          message: 'User successfully logged in',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
  });
        }
        return res.status(400).json({message: 'Invalid email or password'})
      }
    } else if (role == 'user'){
      const userExists =await prisma.user.findUnique({where: {email: email}})
      if(!userExists){
        return res.status(400).json({message: 'email does not exist'})
      }else{
        const isMatch = await bcrypt.compare(password, userExists.password)
        if(isMatch) {
          const tokens = generateTokens(userExists); 
          return res.status(200).json({
          message: 'User successfully logged in',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
  });
        }
        return res.status(400).json({message: 'password doesnt match'})
      }
    }else{
      return res.status(400).json({ message: 'Invalid role' });
    } 
  }catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }

}


export const signup = async(req,res)=> {
  try{
      const role = req.body.role
      if (!role) {
        return res.status(400).json({ message: 'Role is required' });
      }
      if (role === 'org'){
          const {name, email, password, BankAccount, Bank, DescriptionAboutCompany, merchantId} = req.body

        if (!name || !email || !password  || !BankAccount || !Bank || !DescriptionAboutCompany || !merchantId) 
            return res.status(400).json({ message: 'Missing fields' });

        const existingOrg = await prisma.organiser.findUnique({where: {email: email}})

        if(existingOrg){
            return res.status(400).json({ message: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newOrg = await Createorganiser({
            name: name,
            email: email,
            merchantId: merchantId,
            password: hashedPassword,
            BankAccount: BankAccount,
            Bank:Bank,
            DescriptionAboutCompany: DescriptionAboutCompany
        })
        const tokens = generateTokens(newOrg);
        return res.status(201).json({ message: 'Organizer is registered', accessToken: tokens.accessToken,refreshToken: tokens.refreshToken});

    }else if(role == 'user'){
      const {name, email, password, phone} = req.body;
      if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: 'Missing fields' });
      }

      const existingUser = await prisma.user.findFirst({
          where: {
              OR: [
                  { email: email },
                  { phone: phone }
              ]
          }
      })
      if(existingUser){
          return res.status(400).json({ message: 'Email or phone number is already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await CreateUser({
          name: name,
          email: email,
          password: hashedPassword,
          phone: phone
      })
      const tokens = generateTokens(newUser);
        return res.status(201).json({ message: 'User registered', accessToken: tokens.accessToken,refreshToken: tokens.refreshToken});
    }else {
      return res.status(400).json({ message: 'Invalid role' });
    } 
  } catch (err) {
    console.error(err);
      return res.status(500).json({ message: err });
  }
};


