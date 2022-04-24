var mongoose = require("mongoose");
var Schema = mongoose.Schema;

(detailSchema = new Schema(
{
  Post_title: String,
  Post_image: String,
  Post_comment: String,
  new_price: Number,
  old_price: Number,
  Date: String,
 
})),
  (Detail = mongoose.model("Detail", detailSchema));

module.exports = Detail;
