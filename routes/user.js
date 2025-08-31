const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const UserController = require("../controllers/users");
const User = require("../models/user");
const { saveRedirectUrl } = require("../middleware");

// ---------------- Signup & Login ----------------
router
  .route("/signup")
  .get(UserController.renderSignupForm)
  .post(wrapAsync(UserController.signup));

router
  .route("/login")
  .get(UserController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }),
    UserController.login
  );

router.get("/logout", UserController.logout);

// ---------------- Forget Password ----------------
router.get("/forgot-password", (req, res) => {
  res.render("users/forgot");
});

router.post("/forgot-password", wrapAsync(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error", "No account with that email found.");
    return res.redirect("/forgot-password");
  }

  const token = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetURL = `http://${req.headers.host}/reset-password/${token}`;

  // NodeMailer transporter using .env
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    to: user.email,
    from: "no-reply@avinish.com",
    subject: "Password Reset",
    text: `You are receiving this because you (or someone else) requested a password reset.\n\n
           Click the link to reset your password:\n\n${resetURL}\n\n
           If you did not request this, ignore this email.`,
  };

  await transporter.sendMail(mailOptions);

  req.flash("success", "Check your email for the reset link.");
  res.redirect("/login");
}));

// ---------------- Reset Password ----------------
router.get("/reset-password/:token", wrapAsync(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or expired.");
    return res.redirect("/forgot-password");
  }

  res.render("users/reset", { token: req.params.token });
}));

router.post("/reset-password/:token", wrapAsync(async (req, res, next) => {
  const { password, confirm } = req.body;
  if (password !== confirm) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("back");
  }

  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or expired.");
    return res.redirect("/forgot-password");
  }

  await user.setPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.login(user, (err) => {
    if (err) return next(err);
    req.flash("success", "Your password has been changed.");
    res.redirect("/listings");
  });
}));

module.exports = router;

