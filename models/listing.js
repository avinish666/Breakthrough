
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review= require("./reviews");

const listingSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
image :
  {
    url:String,
    filename:String,
  },

  location:String,
  country:String,
  reviews:[
    {
     type:Schema.Types.ObjectId, 
     ref:"Review",
    },
  ],
  owner :{
    type: mongoose.Schema.Types.ObjectId,
    ref:"User",
  }
//  geometry: { 
//   type: {
//     type: String,
//     enum: ['Point'],
//     required: true
//   },
//   coordinates: {
//     type: [Number],  // <-- don't assign real values here
//     required: true
//   }
// }


});

listingSchema.post("findOneAndDelete", async(listing) =>{
   if(listing){
      await Review.deleteMany({_id: {$in:listing.reviews}});
   }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports=Listing;