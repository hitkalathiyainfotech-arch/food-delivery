import { config } from 'dotenv'; config()
import mongoose from "mongoose";
import UserModel from "../model/user.model.js";
import bcrypt from "bcryptjs";
import twilio from 'twilio'



const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;


const client = twilio(accountSid, authToken);

class AuthController {
    //salt rounds
    static saltRounds = 10

    //new Register user Controller [core register]
    static async newUserRegisterController(req, res) {
        try {
            const { name, mobileNo, email, password } = req.body;

            // Validate request
            if (!name || !mobileNo || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "name, mobileNo, email & password are required!"
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, AuthController.saltRounds);

            // Create new user
            const newUser = await UserModel.create({
                name,
                email,
                mobileNo,
                password: hashedPassword,
            });

            // Send OTP via Twilio
            try {
                const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
                    .verifications.create({
                        to: `+91${mobileNo}`,
                        channel: 'sms'
                    });


                return res.status(200).json({
                    success: true,
                    message: "User registered successfully & OTP sent!",
                    verificationSid: verification.sid,
                    user: {
                        name: newUser.name,
                        mobileNo: newUser.mobileNo,
                        email: newUser.email
                    }
                });

            } catch (twilioError) {
                console.error("Twilio OTP Error:", twilioError.message);
                return res.status(500).json({
                    success: false,
                    message: "Error while Sending OTP : "
                })
            }

        } catch (error) {
            console.error("Registration Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Error registering new user & sending OTP",
                error: error.message
            });
        }
    }


    //verify mobile otp & verifed : true,
    static async verifyMobileOtpController(req, res) {
        try {
            // Ensure req.body is parsed
            if (!req.body) {
                return res.status(400).json({
                    success: false,
                    message: "Request body is missing!"
                });
            }

            const { mobileNo, otp } = req.body;

            // Validate input
            if (!mobileNo || !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Mobile number & OTP are required!"
                });
            }

            // Check if user exists
            const user = await UserModel.findOne({ mobileNo });
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: "This mobile number is not registered!"
                });
            }

            // Twilio OTP verification
            const verificationCheck = await client.verify.v2
                .services(process.env.TWILIO_VERIFY_SID)
                .verificationChecks.create({
                    to: `+91${mobileNo}`,
                    code: otp
                });

            console.log("Twilio Verification Status:", verificationCheck.status);

            if (verificationCheck.status === "approved") {
                // Update user verified status
                user.verified = true;
                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "OTP verified successfully",
                    mobileNo: user.mobileNo
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP"
                });
            }

        } catch (error) {
            console.error("OTP Verification Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Error while verifying OTP",
                error: error.message
            });
        }
    }

}

export default AuthController