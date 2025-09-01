const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");

// INDEX
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// NEW FORM
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// CREATE
module.exports.createListing = async (req, res) => {
  const { location } = req.body.listing;
  const newListing = new Listing(req.body.listing);

  try {
    // 1. Geocode using Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    );
    const data = await response.json();

    if (data.length > 0) {
      newListing.geometry = {
        type: "Point",
        coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
      };
    } else {
      newListing.geometry = {
        type: "Point",
        coordinates: [77.209, 28.6139], // fallback: Delhi
      };
    }

    // 2. Add images from Cloudinary
    if (req.files && req.files.length > 0) {
      newListing.image = req.files.map(f => ({
        url: f.path,
        filename: f.filename,
      }));
    }

    // 3. Set owner from logged-in user
    newListing.owner = req.user._id;

    // 4. Save listing
    await newListing.save();
    req.flash("success", "New listing created");
    res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    console.error("❌ Error creating listing:", err);
    req.flash("error", "Failed to create listing. Please try again.");
    res.redirect("/listings/new");
  }
};


// SHOW
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  console.log("Request for ID:", id);

  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: { path: "author" },
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "The listing you requested does not exist");
    return res.redirect("/listings");
  }

  console.log("listing found:", listing.title);

  // ✅ Pass Razorpay Key ID to EJS
  return res.render("listings/show.ejs", {
    listing,
    currUser: req.user,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  });
};

// EDIT
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  console.log("EDIT PAGE ID:", { id });
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "The listing you requested does not exist");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// UPDATE
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (req.files && req.files.length > 0) {
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    listing.image.push(...imgs); // append new images
    await listing.save();
  }

  req.flash("success", "Listing updated");
  res.redirect(`/listings/${id}`);
};

// DELETE
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing deleted");
  res.redirect("/listings");
};
