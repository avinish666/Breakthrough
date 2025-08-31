const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
// 1️⃣ Create Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,      // from .env
  key_secret: process.env.RAZORPAY_KEY_SECRET, // from .env
});

router.post("/create-order", async (req, res) => {
  try {
    const { amount, listingId } = req.body;
    console.log("📥 Create Order Request:", req.body);

    if (!amount || isNaN(amount)) {
      console.error("❌ Invalid amount received:", amount);
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const options = {
      amount: amount * 100, // convert to paise
      currency: "INR",
      receipt: `rcpt_${listingId.slice(-6)}_${Date.now().toString().slice(-6)}`, // <=40 chars
    };

    console.log("🛠 Creating Razorpay Order with options:", options);

    const order = await razorpay.orders.create(options);

    console.log("✅ Razorpay Order Created:", order);

    res.json({ success: true, order });
  } catch (err) {
    console.error("❌ Error creating Razorpay order:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to create order" });
  }
});



router.post("/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Step 1: Generate signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    // Step 2: Compare signatures
    if (expectedSign === razorpay_signature) {
      console.log("✅ Payment verified successfully");
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      console.log("❌ Payment signature mismatch");
      res.status(400).json({ success: false, error: "Payment verification failed" });
    }
  } catch (err) {
    console.error("Error verifying payment:", err);
    res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

module.exports = router;
