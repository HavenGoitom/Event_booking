import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { prisma } from "../prismaClient.js";
import { generateTokens } from "../utils/generateTokens.js";

dotenv.config();

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body; // frontend sends refresh token in the body

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    // verify refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Invalid or expired refresh token" });

      // decoded contains whatever you put in the token 
      const email = decoded.email;

      // Check if user still exists
      const user = await prisma.user.findUnique({ where: { email: email } }) ||
                   await prisma.organiser.findUnique({ where: { email: email } });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      return res.status(200).json({
        message: "Tokens refreshed successfully",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken, // optional she can still reuse old one
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};