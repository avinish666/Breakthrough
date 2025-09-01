const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const Razorpay = require("razorpay");
const crypto = require("crypto");

// ✅ Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. GET listings + CREATE
router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// 2. New form
router.get("/new", isLoggedIn, listingController.renderNewForm);

// ✅ 3. SEARCH route - place before :id
router.get("/search", async (req, res) => {
  const { location } = req.query;
  let query = {};

  if (location && location.trim() !== "") {
    query.location = { $regex: `^${location.trim()}$`, $options: "i" };
  }

  try {
    console.log("MongoDB query being used:", query);
    const listings = await Listing.find(query);
    res.render("listings/index", {
      allListings: listings,
      location,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Search failed.");
    res.redirect("/listings");
  }
});

// 4. Edit form
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);

// ✅ 5. SHOW, UPDATE, DELETE listing
router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.array("image[]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

/* =====================================================
   🔹 Razorpay Payment Integration
===================================================== */

// Create order for a listing
router.post("/:id/order", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const options = {
      amount: listing.price * 100, // price in paise
      currency: "INR",
      receipt: `order_rcptid_${id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});

// Verify payment
router.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      // ✅ Payment verified
      return res.json({ success: true, message: "Payment verified" });
    } else {
      return res.status(400).json({ success: false, message: "Verification failed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error verifying payment" });
  }
});

// ✅ Export router after all routes
module.exports = router;
