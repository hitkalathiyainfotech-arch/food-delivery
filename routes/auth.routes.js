import express from 'express';
import AuthController from '../controller/auth.controller.js';

const router = express.Router();

//base url = domain/api

// 1. register / login == email/passard || google

//register user
router.post("/new/user", AuthController.newUserRegisterController);

//verify OTP
router.post("/verfiy/motp", AuthController.verifyMobileOtpController);


export default router