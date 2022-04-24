const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/Hack36",
{
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fbSchema = mongoose.Schema(
{
    uid: String,
    token: String,
    email: String,
    name: String,
    gender: String,
    pic: String
});

module.exports = mongoose.model('fbUser', fbSchema);