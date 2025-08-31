const Listing = require("../models/listing.js");
const Review = require("../models/reviews.js");

module.exports.createReview =async (req, res) => {
    console.log("Review data received:", req.body); 
    const { id } = req.params; // ✅ corrected from req.params.id
    const listing = await Listing.findById( id);
    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();
    req.flash("success" ,"new review created");
    res.redirect(`/listings/${listing._id}`);
};

module.exports.destroyReview =async (req, res) => {
    const { id, reviewId } = req.params; // ✅ corrected
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success" ,"review deleted");
    res.redirect(`/listings/${id}`);
};