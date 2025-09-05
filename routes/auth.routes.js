import express from 'express';
import { AuthController } from '../controller/auth.controller.js';

const router = express.Router();

//base url = domain/api

//register
router.post("/new/user", AuthController.newUserRegisterController);
router.post("/verfiy/motp", AuthController.verifyMobileOtpController);

//register & login with (google/facebook)
router.post("/new/social/user", AuthController.newSocialRegisterLoginController)

//User login
router.post("/login", AuthController.userLoginController);
router.post("/forget/password", AuthController.sendForgotMailOtpController);
router.post("/verify/forget/password", AuthController.verifyForgetOtpController)
router.post("/reset/password", AuthController.resetPasswordController)

export default router