import { config } from 'dotenv'; config()
import mongoose from "mongoose";
import UserModel from "../model/user.model.js";
import bcrypt from "bcryptjs";
import twilio from 'twilio'
import jwt from 'jsonwebtoken';

//twillio config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;


const client = twilio(accountSid, authToken);

class AuthController {
    //salt rounds
    static saltRounds = 10

    //JWT_SECRET define
    static JWT_SECRET = process.env.JWT_SECRET
    //new Register user Controller [core register]
    static async newUserRegisterController(req, res) {
        try {
            const { name, mobileNo, email, password } = req.body;

            // Validate request
            if (!name && !mobileNo && !email && !password) {
                return res.status(400).json({
                    success: false,
                    message: "name, mobileNo, email & password are required!"
                });
            }

            //check is Already Register or Not
            const isExist = await UserModel.find({ email: email });
            if (isExist) {
                return res.status(409).json({
                    success: false,
                    message: "You'r Already Register Please! Login"
                })
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
        const COMMON_OTP = "000000";

        try {
            const { mobileNo, otp } = req.body;

            // Validate input
            if (!mobileNo && !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Mobile number & OTP are required!"
                });
            }

            // Check if user exists
            const user = await UserModel.findOne({ mobileNo });
            if (user) {
                const payload = {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }

                const token = jwt.sign(payload, AuthController.JWT_SECRET, { expiresIn: "7d" });

                return res.status(200).json({
                    success: true,
                    message: "User already exists, login successful",
                    user: user,
                    token: token
                });
            }

            // Twilio OTP verification
            try {
                const verificationCheck = await client.verify.v2
                    .services(process.env.TWILIO_VERIFY_SID)
                    .verificationChecks.create({
                        to: `+91${mobileNo}`,
                        code: otp
                    });

                console.log("Twilio Verification Status:", verificationCheck.status);

                if (verificationCheck.status === "approved") {
                    user.verified = true;
                    await user.save();

                    return res.status(200).json({
                        success: true,
                        message: "OTP verified successfully (via Twilio)",
                        mobileNo: user.mobileNo
                    });
                }
            } catch (twilioError) {
                console.warn("Twilio Verification Failed:", twilioError.message);
            }

            // common OTP checking
            if (otp === COMMON_OTP) {
                user.verified = true;
                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "OTP verified successfully (via COMMON_OTP)",
                    mobileNo: user.mobileNo
                });
            }

            // If both failed → invalid OTP
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });

        } catch (error) {
            console.error("OTP Verification Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Error while verifying OTP",
                error: error.message
            });
        }
    }

    // social register controller register & login with (Google/facebook)
    static async newSocialRegisterLoginController(req, res) {
        try {
            const { uid, name, email, avatar } = req.body;

            if (!uid && !name && !email && !avatar) {
                return res.status(400).json({
                    success: false,
                    message: "uid, name, email & avatar are required!"
                });
            }

            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                const payload = {
                    id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role
                }

                const token = jwt.sign(payload, AuthController.JWT_SECRET, { expiresIn: "7d" });

                return res.status(200).json({
                    success: true,
                    message: "User already exists, login successful",
                    user: existingUser,
                    token: token
                });
            }

            // Create new social user
            const newUser = await UserModel.create({
                uid,
                name,
                email,
                avatar,
                verified: true
            });

            return res.status(201).json({
                success: true,
                message: "New social login & registration successful",
                user: newUser
            });

        } catch (error) {
            console.error("Social Register Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Error while registering social user",
                error: error.message
            });
        }
    }

    //login (core) using email & password
    static async userLoginController(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required!"
                });
            }

            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "You are not registered, please sign up first 🙏"
                });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid password!"
                });
            }

            const payload = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "user"
            };

            const token = jwt.sign(payload, AuthController.JWT_SECRET, { expiresIn: "7d" });

            return res.status(200).json({
                success: true,
                message: "Login successfull",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            });

        } catch (error) {
            console.error("Login Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Error while logging in",
                error: error.message
            });
        }
    }
    
    
}

export default AuthController