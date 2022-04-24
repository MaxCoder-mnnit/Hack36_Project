const mongoose = require('mongoose');
const details = new mongoose.Schema({
    name:
    {
        type: String,
        required: 'This field is required.',
        maxLength: 15
    },
    email:
    {
        type: String,
        required: 'This field is required.',
        maxLength: 30
    },
    password:
    {
        type: String,
        required: 'This field is required.',
        minLength: 8
    }
});

const User = mongoose.model('User', details); 
module.exports = User;