const express = require('express');
const router = express.Router({ mergeParams: true }); // allows access to listingId
const mongoose = require('mongoose');
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Review = require("../models/reviews.js");
const Listing = require("../models/listing.js");
const {isLoggedIn, isReviewAuthor} = require("../middleware.js");
const {validateReview} = require("../middleware.js");
const reviewController = require("../controllers/reviews");

// Create Review
router.post("/",
    isLoggedIn, validateReview,
     wrapAsync(reviewController.createReview)
);

// Delete Review
router.delete("/:reviewId", 
    isLoggedIn, 
    isReviewAuthor, 
    wrapAsync(reviewController.destroyReview)
);

module.exports = router;
