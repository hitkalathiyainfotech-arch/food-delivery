import express from 'express';
import { AuthController } from '../controller/auth.controller.js';

const indexRouter = express.Router();

//base url = domain/api

//register
indexRouter.post("/new/user", AuthController.newUserRegisterController);
indexRouter.post("/verfiy/motp", AuthController.verifyMobileOtpController);

//register & login with (google/facebook)
indexRouter.post("/new/social/user", AuthController.newSocialRegisterLoginController)

//User login
indexRouter.post("/login", AuthController.userLoginController);
indexRouter.post("/forget/password", AuthController.sendForgotMailOtpController);
indexRouter.post("/verify/forget/password", AuthController.verifyForgetOtpController)
indexRouter.post("/reset/password", AuthController.resetPasswordController);


export default indexRouter