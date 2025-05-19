// controllers/user.controller.js
const prisma = require("../config/database");
const bcrypt = require("bcrypt");
const { logAction } = require("../utils/logger");
const { generateVerificationCode } = require("../utils/helpers"); // <-- IMPORT
const { sendEmail } = require("../config/email"); // <-- IMPORT
const { renderEmailTemplate } = require("../utils/renderEmailTemplate"); // <-- IMPORT

/**
 * Updates the profile of the currently authenticated user.
 * Allows updating name, email (requires re-verification if changed), and password.
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};
    let emailChanged = false;
    let newVerificationCode = null;

    if (name && name !== user.name) {
      updateData.name = name;
    }

    if (email && email !== user.email) {
      const existingEmailUser = await prisma.user.findFirst({
        where: { email: email, NOT: { id: userId } },
      });
      if (existingEmailUser) {
        return res
          .status(400)
          .json({ message: "New email address is already in use" });
      }
      updateData.email = email;
      updateData.email_verified = false;
      newVerificationCode = generateVerificationCode(); // Generate code
      updateData.email_verification_code = newVerificationCode;
      emailChanged = true;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({
            message: "Current password is required to set a new password",
          });
      }
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Incorrect current password" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters long" });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No changes provided to update" });
    }

    const updatedUserFromDb = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      // Select only necessary fields to return or use for email
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        role: { select: { name: true } },
      },
    });

    if (emailChanged && newVerificationCode) {
      const verificationLink = `${
        process.env.FRONTEND_URL
      }/verify-email?code=${newVerificationCode}&email=${encodeURIComponent(
        updatedUserFromDb.email
      )}`;
      const htmlEmail = renderEmailTemplate("verificationEmail", {
        name: updatedUserFromDb.name,
        verificationCode: newVerificationCode,
        verificationLink: verificationLink,
      });
      if (htmlEmail) {
        await sendEmail(
          updatedUserFromDb.email,
          "Verify Your New Email Address - Parking System",
          `Your email verification code for the new email address is: ${newVerificationCode}`,
          htmlEmail
        );
      } else {
        console.error("Could not render new email verification template.");
        // Fallback
        await sendEmail(
          updatedUserFromDb.email,
          "Verify Your New Email Address - Parking System",
          `Your email verification code for the new email address is: ${newVerificationCode} (Template Error)`,
          `<p>Your new email verification code is: <strong>${newVerificationCode}</strong></p>`
        );
      }
    }

    await logAction({
      userId: updatedUserFromDb.id,
      action: "User updated own profile",
      entityType: "User",
      entityId: updatedUserFromDb.id,
      details: { changes: Object.keys(updateData) },
    });

    res.status(200).json({
      message: `Profile updated successfully.${
        emailChanged ? " Please verify your new email address." : ""
      }`,
      user: {
        // Return the updated user data
        id: updatedUserFromDb.id,
        name: updatedUserFromDb.name,
        email: updatedUserFromDb.email,
        role: updatedUserFromDb.role.name,
        email_verified: updatedUserFromDb.email_verified,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

module.exports = {
  updateUserProfile,
};
