if(process.env.NODE_ENV !== "production") {
     require('dotenv').config();
}
const express = require("express");
const app=express();
const path=require("path");
const mongoose=require("mongoose");
const methodOverride=require("method-override");
const ejsMate= require("ejs-mate");
const ExpressError=require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require ("passport-local");
const User = require("./models/user.js");
const {listingSchema,reviewSchema} =require("./schema.js");
const Review =require("./models/reviews.js");
const { options } = require("joi");
const paymentRouter = require("./routes/paymentRoutes.js");




const listingsRoutes = require("./routes/listing.js");
const reviewRouter = require ("./routes/review.js");
const userRouter =require ("./routes/user.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/Wanderlust";

const dburl = process.env.ATLASDB_URL;
main()
.then(() =>{
    console.log("connected to db");
})
.catch((error)=>{
    console.log(error);
});
 async function main(){
      await mongoose.connect(dburl);
 }
 app.engine('ejs', ejsMate);
 app.set("view engine","ejs");
 app.set("views", path.join(__dirname, "views"));
 app.use(express.urlencoded({extended:true}));
 // Parse JSON body
app.use(express.json());
 app.use(methodOverride("_method"));
 app.use(express.static(path.join(__dirname, "public")));
 app.use('/uploads', express.static('uploads'));
 


const store = MongoStore.create({
    mongoUrl :dburl,
    crypto :{
        secret:"mysupersecretcode",
    },
    touchAfter: 24 * 3600,
});

 store.on("error", () =>{
     console.log("ERROR in MONGO SESSION STORE" ,err);
 });
const sessionOptions = {
    store,
    secret:"mysupersecretcode",
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires :Date.now() + 7 * 24 *60 * 60 *1000 ,
        maxAge: 7 * 24 * 60 * 60 *1000,
        httpOnly:true,
     secure: process.env.NODE_ENV === "production",
    },
};



 
// app.get("/", (req, res) =>{
//          res.send("/avinish....");
// });

  
app.use( session ( sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) =>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

app.use("/listings", listingsRoutes);
app.use("/listings/:id/reviews" , reviewRouter);
app.use("/", userRouter);
app.use("/payment", paymentRouter);

 
// app.all("*", (req, res, next) => {
//   next(new ExpressError("Page Not Found", 404));
// });

 app.use((err, req, res, next) =>{
     let {statusCode=500, message ="something went wrong"}= err;
     res.status(statusCode).render("error.ejs", {message});
 });
``


app.listen(8080, ()=>{
    console.log("server is listening to post 8080");
});
