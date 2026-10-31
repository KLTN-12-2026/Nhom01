import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    createReview,
    getProductReviews,
    getAllReviews,
    replyToReview,
    checkCanReview,
    getMyReviews
} from "../controllers/review.controller.js";

const reviewRouter = Router();

reviewRouter.post("/create", auth, createReview);
reviewRouter.get("/product/:productId", getProductReviews);
reviewRouter.get("/all", auth, getAllReviews);
reviewRouter.put("/reply/:id", auth, replyToReview);
reviewRouter.get("/can-review/:productId", auth, checkCanReview);
reviewRouter.get("/my", auth, getMyReviews);

export default reviewRouter;
