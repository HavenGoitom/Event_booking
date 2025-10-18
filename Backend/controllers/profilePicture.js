import {CreateAndUpdateProfile} from '../../DataBaseManipulation.js';
import { prisma } from '../../prismaClient.js';
import path from 'path';


export const createAndUpdateProfile = async (req, res) => {
  try {
    // multer set upload.single('profilePicture'), so req.file should exist
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const roleParam = req.params.role; // from route /upload/:role
    if (roleParam !== 'org') return res.status(403).json({ message: 'Role not supported' });

    const { organiserId } = req.body;
    if (!organiserId) return res.status(400).json({ message: 'organiserId required in body' });

    // Optionally check authenticated user matches organiserId (if you store user id in req.user)
    if (req.user) {
      // if you want to enforce that only the organiser can change their pfp:
      if (req.user.role !== 'org' || req.user.id !== organiserId) {
        return res.status(403).json({ message: 'Not authorized to change this organiser profile' });
      }
    }

    // verify organiser exists
    const organiser = await prisma.organiser.findUnique({ where: { id: organiserId } });
    if (!organiser) return res.status(404).json({ message: 'Organiser not found' });

    // Build the accessible path that matches your static route (app.use('/uploads', express.static('uploads')))
    const filename = req.file.filename ?? path.basename(req.file.path);
    const picturePath = path.posix.join('/uploads', 'profilePicture', filename); // e.g. /uploads/profilePicture/123.png

    const profile = await CreateAndUpdateProfile({
      organiserId: organiser.id,
      picturePath
    });

    // full URL for frontend
    const fullUrl = `${req.protocol}://${req.get('host')}${profile.picture}`;

    return res.status(200).json({ message: 'Profile picture saved', profile, url: fullUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
export const getProfile = async (req,res)=>{
    try {
        const { id, role } = req.params; // get id and role from route params

        // fetch user based on role
        let user;
        if (role === 'user') {
        profile = await prisma.profile.findUnique({ where: { id: id } });
        } else if (role === 'org') {
        profile = await prisma.profile.findUnique({ where: { id: id } });
        } else {
        return res.status(400).json({ message: 'Role not supported' });
        }

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