import express from 'express';
import AuthController from '../controller/auth.controller.js';

const router = express.Router();

//base url = domain/api

// 1. register / login == email/passard || (google/facebook)

//register user
router.post("/new/user", AuthController.newUserRegisterController);

//verify OTP
router.post("/verfiy/motp", AuthController.verifyMobileOtpController);

//register & login with (google/facebook)
router.post("/new/social/user", AuthController.newSocialRegisterLoginController)

//User login
router.post("/login", AuthController.userLoginController);

//forget-password (send Email OTP)
router.post("/forget-password", AuthController)
//verify-forget-password

//reset-password

//change-password
export default router