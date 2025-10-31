import {CreateAndUpdateProfile} from '../DataBaseManipulation.js';
import { prisma } from '../prismaClient.js';
import path from 'path';


export const createAndUpdateProfile = async (req, res) => {
  try {
    console.log('--- multer file ---', req.file);
    console.log('--- req.body ---', req.body);

    // multer set upload.single('profilePicture'), so req.file should exist
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email required in body' });

    // verify organiser exists
    const organiser = await prisma.organiser.findUnique({ where: { email } });
    if (!organiser) return res.status(404).json({ message: 'Organiser not found' });

    // Build the accessible path that matches your static route (app.use('/uploads', express.static('uploads')))
    const filename = req.file.filename ?? path.basename(req.file.path);
    const relativePath = path.posix.join('/uploads', 'profilePicture', filename); // e.g. /uploads/profilePicture/123.png

    // use BASE_URL if provided (recommended for production), otherwise infer from request
    const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const fullUrl = `${base}${relativePath}`;

    // Save the full, public URL into your DB
    await CreateAndUpdateProfile({
      organiser: true,
      Email: email,
      // store the absolute URL so GET requests don't need to transform it
      profile: fullUrl
    });

    return res.status(200).json({ message: 'Profile picture saved', url: fullUrl });
  } catch (err) {
    console.error('createAndUpdateProfile error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};



export const getProfile = async (req,res)=>{
    try {
        const { email } = req.body; // get email from route params
      if(!email){return res.status(402).json({ message: 'Email is required' });}
        let profile = await prisma.organiser.findUnique({ where: { email: email } , select: {
           name: true,               
           profilePicture: true,      
           BankAccount : true,           
           Bank: true,                  
           email:true,                   
           DescriptionAboutCompany:true, 
        } });

        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        return res.status(200).json(profile);
  } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
  }
};
/*model profilePicture {
  // in prisma model names are singular
  id             String     @id @default(uuid())
  organisationId String?    @unique
  organisation   Organiser? @relation(fields: [organisationId], references: [id])
  picture        String
} */