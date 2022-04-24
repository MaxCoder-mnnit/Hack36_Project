var mongoose = require("mongoose");
var Schema = mongoose.Schema;

(orderSchema = new Schema(
{
  email: String,
  title: String,
  image: String,
  description: String,
  price: Number,
  Date: String,
})),

(order = mongoose.model("order", orderSchema));

module.exports = order;
