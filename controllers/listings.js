const Listing = require("../models/listing");
const crypto = require("crypto");
const Razorpay = require("razorpay");

// ---------- INDEX ----------
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// ---------- NEW FORM ----------
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// ---------- CREATE ----------
module.exports.createListing = async (req, res) => {
  const { location } = req.body.listing;
  const newListing = new Listing(req.body.listing);

  try {
    // ✅ Node 22 built-in fetch
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`,
      { headers: { "User-Agent": "BreakthroughApp/1.0 (avinish666@example.com)" } }
    );

    const data = await response.json();
    if (data.length > 0) {
      newListing.geometry = {
        type: "Point",
        coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
      };
    } else {
      newListing.geometry = { type: "Point", coordinates: [77.209, 28.6139] }; // fallback Delhi
    }

if (req.files && req.files.length > 0) {
  newListing.image = req.files.map(f => ({ url: f.path, filename: f.filename }));
} else {
  newListing.image = [{ url: "/images/default.jpg", filename: "default" }];
}


    newListing.owner = req.user._id;
    await newListing.save();

    req.flash("success", "New listing created ✅");
    res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create listing.");
    res.redirect("/listings/new");
  }
};

// ---------- SHOW ----------

module.exports.showListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate({ path: "reviews", populate: { path: "author" } })
      .populate("owner");

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    // ✅ Render once and pass Razorpay key
    res.render("listings/show.ejs", {
      listing,
      currUser: req.user,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load listing");
    res.redirect("/listings");
  }
};


// ---------- EDIT -----
module.exports.renderEditForm = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  res.render("listings/edit.ejs", { listing });
};

// ---------- UPDATE ----------
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

  // Append new images
  if (req.files && req.files.length > 0) {
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    listing.image.push(...imgs);
    await listing.save();
  }

  // Remove images if selected
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      listing.image = listing.image.filter(img => img.filename !== filename);
    }
    await listing.save();
  }

  req.flash("success", "Listing updated ✅");
  res.redirect(`/listings/${id}`);
};

// ---------- DELETE ----------
module.exports.destroyListing = async (req, res) => {
  await Listing.findByIdAndDelete(req.params.id);
  req.flash("success", "Listing deleted ✅");
  res.redirect("/listings");
};

// ---------- SEARCH ----------
module.exports.searchListings = async (req, res) => {
  const { location } = req.query;
  let query = {};
  if (location && location.trim() !== "") {
    query.location = { $regex: location.trim(), $options: "i" }; // partial match
  }

  const listings = await Listing.find(query);
  res.render("listings/index.ejs", { allListings: listings, location });
};


  
