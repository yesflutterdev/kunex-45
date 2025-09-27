import jwt from "jsonwebtoken";
import Token from "../models/token.model.js";


export const generateTokens = async (user) => {
  // Generate JWT token
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  );

  // Save refresh token to database
  const newToken = new Token({
    userId: user._id,
    token: refreshToken,
    type: "refresh",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
  await newToken.save();

  return { token, refreshToken };
};
