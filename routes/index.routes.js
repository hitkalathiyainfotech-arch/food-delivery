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

// Category 
indexRouter.post("/createCategory", UserAuth, isAdmin, CategoryController.createCategory)
indexRouter.get("/getAllCategory", UserAuth, CategoryController.getAllCategory)
indexRouter.get("/getCategoryById", UserAuth, CategoryController.getCategoryById)
indexRouter.put("/updateCategory", UserAuth, isAdmin, isSeller, CategoryController.updateCategory)
indexRouter.put("/deleteCategory", UserAuth, isAdmin, CategoryController.deleteCategory)


export default indexRouter