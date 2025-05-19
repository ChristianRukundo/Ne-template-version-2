// controllers/auth.controller.js
const bcrypt = require("bcrypt");
const prisma = require("../config/database");
const { generateToken } = require("../config/auth"); // Simplified import
const { sendEmail } = require("../config/email");
const {
  generateVerificationCode,
  generateRandomToken,
} = require("../utils/helpers");
const { logAction } = require("../utils/logger");
const { RoleName } = require("@prisma/client");
const { renderEmailTemplate } = require("../utils/renderEmailTemplate");

/**
 * Registers a new user.
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const validationErrors = [];
    if (!name || name.trim().length === 0)
      validationErrors.push("Name is required.");
    if (!email) validationErrors.push("Email is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      validationErrors.push("Invalid email format.");
    if (!password) validationErrors.push("Password is required.");
    else if (password.length < 6)
      validationErrors.push("Password must be at least 6 characters long.");

    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: validationErrors });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();

    const userRole = await prisma.role.findUnique({
      where: { name: RoleName.USER },
    });
    if (!userRole) {
      console.error("USER role not found in database. Please run seed script.");
      return res
        .status(500)
        .json({ message: "Server configuration error: User role missing." });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role_id: userRole.id,
        email_verification_code: verificationCode,
      },
    });

    const htmlEmail = renderEmailTemplate("verificationEmail", {
      name: newUser.name,
      verificationCode: verificationCode,
    });

    if (htmlEmail) {
      await sendEmail(
        email,
        "Verify Your Email - Parking System",
        `Your email verification code is: ${verificationCode}`,
        htmlEmail
      );
    } else {
      console.error("Could not render verification email template.");
      await sendEmail(
        email,
        "Verify Your Email - Parking System",
        `Your email verification code is: ${verificationCode}. (Template error)`,
        `<p>Your email verification code is: <strong>${verificationCode}</strong></p>`
      );
    }

    await logAction({
      userId: newUser.id,
      action: "User registered",
      entityType: "User",
      entityId: newUser.id,
    });

    res.status(201).json({
      message:
        "User registered successfully. Please check your email for the verification code.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

/**
 * Verifies a user's email address.
 */

const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ message: "Email and verification code are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.email_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }
    console.log("code");
    console.log(code);

    console.log(user);
    if (user.email_verification_code !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verification_code: null,
      },
    });

    await logAction({
      userId: user.id,
      action: "User email verified",
      entityType: "User",
      entityId: user.id,
    });

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Server error during email verification" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message: "Email not verified. Please verify your email first.",
      });
    }

    const token = generateToken({
      user_id: user.id,
      role_id: user.role.id,
      role_name: user.role.name,
    });

    await logAction({
      userId: user.id,
      action: "User logged in",
      entityType: "User",
      entityId: user.id,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

const logout = async (req, res) => {
  if (req.user && req.user.user_id) {
    await logAction({
      userId: req.user.user_id,
      action: "User logged out (client-side)",
      entityType: "User",
      entityId: req.user.user_id,
    });
  }
  res.status(200).json({
    message:
      "Logged out successfully. Please clear your token on the client-side.",
  });
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      balance : user.balance,
      email_verified: user.email_verified,
      permissions,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res
      .status(500)
      .json({ message: "Server error retrieving user information" });
  }
};

/**
 * Initiates the password reset process by sending an OTP.
 * Reuses `reset_token` field for OTP and `reset_token_expires` for OTP expiry.
 * OTP expiry set to 10 minutes.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        message:
          "If your email is registered, you will receive a password reset OTP.",
      });
    }

    const otp = generateVerificationCode(); // Generate 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: otp, // Store OTP in reset_token field
        reset_token_expires: otpExpires,
      },
    });

    // Use the passwordResetOtpEmail template
    const htmlEmail = renderEmailTemplate("passwordResetOtpEmail", {
      name: user.name,
      otp: otp,
    });

    if (htmlEmail) {
      await sendEmail(
        email,
        "Your Password Reset OTP - Parking System",
        `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`, // Plain text fallback
        htmlEmail
      );
    } else {
      console.error("Could not render password reset OTP email template.");
      await sendEmail(
        email,
        "Your Password Reset OTP - Parking System",
        `Your password reset OTP is: ${otp}. It is valid for 10 minutes. (Template Error)`,
        `<p>Your password reset OTP is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
      );
    }

    await logAction({
      userId: user.id,
      action: "User requested password reset OTP",
      entityType: "User",
      entityId: user.id,
    });

    res.status(200).json({
      message:
        "If your email is registered, you will receive a password reset OTP.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ message: "Server error during password reset OTP request" });
  }
};

/**
 * Resets a user's password using an OTP.
 * Expects email, OTP (as 'otp_code'), and newPassword.
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp_code, newPassword } = req.body; // Changed 'token' to 'otp_code'

    if (!email || !otp_code || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP code, and new password are required" });
    }
    // Add production password validation here
    if (newPassword.length < 6) {
      // Example basic validation
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        reset_token: otp_code, // Check OTP against reset_token field
        reset_token_expires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      },
    });

    await logAction({
      userId: user.id,
      action: "User reset password successfully using OTP",
      entityType: "User",
      entityId: user.id,
    });

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
