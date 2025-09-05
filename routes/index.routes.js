import express from 'express';
import { AuthController } from '../controller/auth.controller.js';
import { CategoryController } from '../controller/category.controller.js';
import { isAdmin, isSeller, UserAuth } from '../middleware/auth.middleware.js';

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

//seller.router.js
indexRouter.post("/new/seller", newSellerController)
indexRouter.post("/verify/seller/otp", verifySellerMobileOtpController)
indexRouter.post("/seller/login", sellerLoginController)
indexRouter.post("/seller/forget/password", sellerForgetPasswordController);
indexRouter.post("/seller/verify/forget/password", sellerVerifyForgetOtpController)
indexRouter.post("/seller/reset/password", sellerPasswordResetController);
// Category 
indexRouter.post("/createCategory", UserAuth, isAdmin, CategoryController.createCategory)
indexRouter.get("/getAllCategory", UserAuth, CategoryController.getAllCategory)
indexRouter.get("/getCategoryById", UserAuth, CategoryController.getCategoryById)
indexRouter.put("/updateCategory", UserAuth, isAdmin, isSeller, CategoryController.updateCategory)
indexRouter.put("/deleteCategory", UserAuth, isAdmin, CategoryController.deleteCategory)



//seller.kyc.router.js
indexRouter.post("/seller/gst/verify", sellerAuth, sellerGstVerifyAndInsertController)
export default indexRouter