import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const accessSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;


export const generateTokens = (newObject) => {
    //jwt.sign(payload, secretOrPrivateKey, [options, call back]) jwt.sign() syntax
    
    // Determine role from object (user has phone, organizer has merchantId)
    const role = newObject.merchantId ? 'org' : 'user';
    
    //access Token
    const accessToken = jwt.sign({
        id: newObject.id,
        email: newObject.email,
        role: role
    }, accessSecret, { expiresIn: '30d' });

    // refresh Token
    const refreshToken = jwt.sign({
        id: newObject.id,
        email: newObject.email,
        role: role
    }, refreshSecret, { expiresIn: '4y' });

    return { accessToken, refreshToken}
}

/*Access token expires → a request returns 401 Unauthorized.

Frontend sends refresh token to a refresh endpoint (/auth/refresh).

Backend validates refresh token → returns a new access token (and optionally a new refresh token).

Frontend stores the new access token and continues making requests. */

