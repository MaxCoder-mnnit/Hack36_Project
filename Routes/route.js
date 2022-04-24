const express = require('express');
const router = express.Router();
const User=require('../models/schema');
const {JoiSchema, forgotSchema} = require('../models/validation');
const bcrypt= require('bcrypt');
const session = require("express-session");
const mongoose = require('mongoose');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const Publishable_Key = process.env.publishableKey;
const Secret_Key = process.env.secretKey;
const stripe = require('stripe')(Secret_Key)

var multer = require("multer");
const path = require("path");
const Details = require("../models/details");
const order = require("../models/order");
const shipping = require("../models/shipping");

const { json } = require("body-parser");
var ObjectID = require('mongodb').ObjectID;

const fbUser = require('../models/fbSchema');
const facebookStrategy = require('passport-facebook').Strategy;

const saltRounds = 10;

global.flag=1;
global.ID;

function OTP(min, max)
{
    global.myNumber = Math.floor(Math.random() * (max - min)) + min;
    return myNumber;
}

router.use((req,res,next)=>
{
    res.locals.Success = req.flash('success');
    res.locals.Error = req.flash('error');
    res.locals.Valid = req.flash('valid');
    next();
});

router.use(passport.initialize());
router.use(passport.session());


mongoose.connect("mongodb://localhost:27017/Hack36", {useNewUrlParser: true});

const gmailSchema = new mongoose.Schema (
{
  email: String,
  password: String,
  googleId: String
});

gmailSchema.plugin(passportLocalMongoose);
gmailSchema.plugin(findOrCreate);

const gmailUser = new mongoose.model("gmailUser", gmailSchema);

passport.use(gmailUser.createStrategy());

passport.serializeUser(function(user, done) 
{
  done(null, user.id);
});

passport.deserializeUser(function(id, done) 
{
  gmailUser.findById(id, function(err, user) 
  {
    done(err, user);
  });
});

passport.use(new GoogleStrategy(
{
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRETS,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback: true
},
  function(req,accessToken, refreshToken, profile, cb)
  {
    console.log(profile);
    req.session.userEmail = profile.emails[0].value;
    gmailUser.findOrCreate({  username: profile.emails[0].value ,googleId: profile.id }, function (err, user)
    {
        return cb(err, user);
    });
  }
));

passport.use(new facebookStrategy(
    {
        clientID: "5269375753083643",
        clientSecret: "247d12553e31f995ed3ea1f6bda74fde",
        callbackURL     : "http://localhost:3000/facebook/callback",
        profileFields: ['id', 'displayName', 'name', 'picture.type(large)','email']
    },
    function(token, refreshToken, profile, done)
    {
        process.nextTick(function()
        {
            fbUser.findOne({ 'uid' : profile.id }, function(err, user) 
            {
                if (err)
                {
                    return done(err);
                }
                if(user)
                {
                    flag=0;
                    return done(null, user); // user found, return that user
                }
                else
                {
                    var newUser = new fbUser();
                    newUser.uid    = profile.id;                  
                    newUser.token = token;                    
                    newUser.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    newUser.email = profile.emails[0].value; 
                    newUser.pic = profile.photos[0].value;
                    flag=0;

                    newUser.save(function(err)
                    {
                        if (err)
                        {
                            throw err;
                        }
                        return done(null, newUser);
                    });
                }
            });
        });
    }));

passport.serializeUser(function(user, done)
{
    done(null, user.id);
});

passport.deserializeUser(function(id, done)
{
    fbUser.findById(id, function(err, user)
    {
       done(err, user);
    });
});


router.get("/",(req,res)=>
{
    res.render("index");
});

router.get("/Template/index",(req,res)=>
{
    res.render("index");
});

router.get("/Template/about",(req,res)=>
{
    res.render("aboutUs");
});

router.get("/Template/contact",(req,res)=>
{
    res.render("contact");
});

router.get("/Template/login",(req,res)=>
{
    res.render("login");
});

router.get("/Template/register",(req,res)=>
{
    res.render("register");
});

router.get("/Template/verifyOtp",(req,res)=>
{
    res.render("verifyOtp");
});

router.get("/Template/verifyForgotOtp",(req,res)=>
{
    res.render("verifyForgotOTP");
});

router.get("/Template/forgotEmail",(req,res)=>
{
    res.render("forgotEmail");
});


router.get("/Template/changePassword",(req,res)=>
{
    res.render("changePassword");
});

router.get("/Template/signout",(req,res)=>
{
    flag=1;
    req.session.destroy();
    res.redirect("/");
});

router.get("/imagePost", (req, res) =>
{
    res.render("imagePost");
});

router.get("/description", (req, res) =>
{
      res.render("description");
});

router.get('/auth/google', passport.authenticate('google',
{
   scope: ['profile',"email"]
}));

router.get("/auth/google/secrets", passport.authenticate('google',
{
    failureRedirect: "/Template/login"
}),
  function(req, res)
  {
      flag=0;
      res.redirect("/");
  });

  router.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

  router.get('/facebook/callback', passport.authenticate('facebook',
  {
      successRedirect : '/',
      failureRedirect : '/Template/login'
  }));

const validateProfile = (req, res, next) =>
{
    const { error } = JoiSchema.validate(req.body);
    if (error)
    {
        console.log(error.message);
        req.flash('valid',error.message);
        res.redirect('/Template/register');
    }
    else
    {
        console.log('errorless');
        next();
    }
}

const forgotPassword = (req, res, next) =>
{
    const { error } = forgotSchema.validate(req.body);
    if (error|| req.body.password!=req.body.cpassword)
    {
        console.log(error.message);
        req.flash('valid',error.message);
        res.redirect('/Template/changePassword');
    }
    else
    {
        console.log('errorless');
        next();
    }
}

const isLogin = (req, res, next) =>
{
    if (flag)
    {
        req.flash('valid','Please Login First to continue');
        res.redirect('/Template/login');
    }
    else
    {
        next();
    }
}

router.post("/User/save",validateProfile,(req,res)=>
{
        User.findOne({ email: req.body.email }, function (err, docs)
        {
            if(Boolean(docs))  /*Check for email existence*/
            {
                console.log("Email Already Exists");
                req.flash('error','Id Already Exists');
                res.redirect('/Template/login');
            }   
            else
            {
                if(req.body.password!=req.body.cpassword) 
                {
                    console.log("Email Already Exists");
                    req.flash('error','Password and Confirm Password does not match');
                    res.redirect('/Template/register');
                } 
                else
                {  
                    bcrypt.hash(req.body.password, saltRounds, function(err, hash)
                    {
                        const newUser=new User({name:req.body.name,email:req.body.email,password:hash});
                        const hello =  newUser.save();
                        console.log("Sign up successfull Redirecting to signin page");
                        req.flash('success','Successfully signed up!');
                        res.redirect('/Template/login');   
                    });
                }
            }
        });
});

router.post("/User/login", (req,res)=>
{
    const formData=new User(req.body);
    const formEmail=formData.email;
    const formPassword=formData.password;
    
    User.findOne({ email: formEmail }, function (err, docs) 
    {
             if(Boolean(docs))  /*Check for email existence*/
             {
                bcrypt.compare(formPassword, docs.password, function(err, result)
                {
                    if(result === true)
                    {
                        res.redirect('/User/sendOtp?email='+docs.email);
                    }
                    else
                    {
                        console.log('Wrong password');
                        req.flash('error','Password entered by you is wrong');
                        res.redirect('/Template/login');
                    }
                });
             }
             else
             {
                 console.log("User Does not exists"); 
                 req.flash('error','Id Does Not Exists');
                 res.redirect('/Template/register');
             }
    });
});

router.post("/User/forgot", forgotPassword, (req,res)=>
{
    const formEmail = req.session.forgotEmail;

    if(req.body.password!=req.body.cpassword)  
    {
        console.log("Password Mismatch");
        req.flash('error','Password and Confirm Password does not match');
        res.redirect('/Template/changePassword');
    }
    else
    {
    User.findOne({ email: formEmail }, function (err, docs) 
    {
             if(Boolean(docs))  
             {
                        bcrypt.hash(req.body.password, saltRounds, function(err, hash)
                        {
                        User.findOneAndUpdate({ _id: docs._id }, {password:hash}, { new: true }, (err, result) => 
                        {
                            if (!err)
                            {
                                console.log('password changed successfully');
                                req.flash('success','Password changed successfully');
                                res.redirect('/Template/login');
                            }
                            else 
                            {
                                console.log(`Password not changed successfully ${err}`);
                                req.flash('error',`Password not changed ${err}`);
                                res.redirect('/Template/changePassword');
                            }
                        });
                        });
             }
             else
             {
                 console.log("User Does not exists");
                 req.flash('error','Id Does Not Exists');
                 res.redirect('/Template/register'); 
             }
    });
   }
});

router.get("/User/sendOtp",(req,res)=>
{
    const formEmail=req.query.email;
    User.findOne({ email: formEmail }, function (err, docs) 
    {
             if(Boolean(docs)) 
             {
                const nodemailer = require('nodemailer');
                const CLIENT_ID = process.env.CLIENT_ID_OTP;
                const CLIENT_SECRET = process.env.CLIENT_SECRET_OTP;
                const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
                
                const transporter = nodemailer.createTransport(
                {
                    service: 'gmail',
                    auth:
                    {
                      type: 'OAuth2',
                      user: 'educatorsindia2022@gmail.com',
                      clientId: CLIENT_ID,
                      clientSecret: CLIENT_SECRET,
                      accessToken: CLIENT_TOKEN,
                    },											  					  					  
                });
                
                    const mailOptions =
                    {                  
                      from: 'educatorsindia2022@gmail.com',
                      to: formEmail,
                      subject:  'OTP Validation',
                      text: 'Your OTP is:- ',
                      html: `<h1>OTP ${OTP(1000,9999)} Do Not Share With Anyone</h1>`,
                    };
                    transporter.sendMail(mailOptions, function(error, info)
                    {
                        if (error)
                        {
                           console.log(error);
                        }            
                        else
                        {
                           req.session.userEmail=formEmail;
                           console.log('OTP Send Successfully: ' + info.response);
                           req.flash('success','OTP Send Successfully');            
                           res.redirect('/Template/verifyOtp');                        
                        }
                    });                
             }

             else
             {
                console.log("User Does not exists");
                req.flash('error','Id Does Not Exists');
                res.redirect('/Template/register');
             }
    });
});

router.post("/Template/verifyOtp",(req,res)=>
{
    const otp=req.body.otp;
    if(otp==myNumber)
    {
        console.log('OTP validation successfull');
        flag=0;
        req.flash('success','OTP validation successfull');
        res.redirect('/Template/index');
    }
    else
    {
        console.log("Wrong OTP");
        req.flash('error','Wrong OTP Try Again!');
        res.redirect('/Template/login');
    }
});


router.post("/Template/forgotEmail",(req,res)=>
{
    const formEmail=req.body.email;
    req.session.forgotEmail=formEmail;

    User.findOne({ email: formEmail }, function (err, docs) 
    {
             if(Boolean(docs)) 
             {
                const nodemailer = require('nodemailer');
                const CLIENT_ID = process.env.CLIENT_ID_OTP;
                const CLIENT_SECRET = process.env.CLIENT_SECRET_OTP;
                const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
                
                const transporter = nodemailer.createTransport(
                {
                    service: 'gmail',
                    auth:
                    {
                      type: 'OAuth2',
                      user: 'educatorsindia2022@gmail.com',
                      clientId: CLIENT_ID,
                      clientSecret: CLIENT_SECRET,
                      accessToken: CLIENT_TOKEN,
                    },											  					  					  
                });
                
                    const mailOptions =
                    {                  
                      from: 'educatorsindia2022@gmail.com',
                      to: formEmail,
                      subject:  'OTP Validation',
                      text: 'Your OTP is:- ',
                      html: `<h1>OTP ${OTP(1000,9999)} Do Not Share With Anyone</h1>`,
                    };
                    transporter.sendMail(mailOptions, function(error, info)
                    {
                        if (error)
                        {
                           console.log(error);
                        }            
                        else
                        {
                           console.log('OTP Send Successfully: ' + info.response);
                           req.flash('success','OTP Send Successfully');            
                           res.redirect('/Template/verifyForgotOTP');                        
                        }
                    });            
             }
             else
             {
                 console.log("User Does not exists");
                 req.flash('error','Id Does Not Exists');
                 res.redirect('/Template/register');
             }
    });
});


router.post("/Template/verifyForgotOtp",(req,res)=>
{
    const otp=req.body.otp;
    if(otp==myNumber)
    {
        console.log('OTP validation successfull');
        res.redirect('/Template/changePassword');
    }
    else
    {
        console.log("Wrong OTP");
        req.flash('error','Wrong OTP Try Again!');
        res.redirect('/Template/login');
    }
});

router.post("/User/contact",(req,res)=>
{
    const email=req.body.email;
    const mobile=req.body.phone;
    const message=req.body.message;
    const name=req.body.name;

                const nodemailer = require('nodemailer');
                const CLIENT_ID = process.env.CLIENT_ID_OTP;
                const CLIENT_SECRET = process.env.CLIENT_SECRET_OTP;
                const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
                
                const transporter = nodemailer.createTransport(
                {
                    service: 'gmail',
                    auth:
                    {
                      type: 'OAuth2',
                      user: 'educatorsindia2022@gmail.com',
                      clientId: CLIENT_ID,
                      clientSecret: CLIENT_SECRET,
                      accessToken: CLIENT_TOKEN,
                    },											  					  					  
                });
                
                    const mailOptions =
                    {                  
                      from: 'educatorsindia2022@gmail.com',
                      to: 'educatorsindia2022@gmail.com',
                      subject: `Enquiry by Mr/Mrs ${name}`,
                      text: 'My Enquiry:-',
                      html: `<h1>${message} You can Contact me on +91 ${mobile} or Mail me on ${email}</h1>`,
                    };

                    transporter.sendMail(mailOptions, function(error, info)
                    {
                        if (error)
                        {
                           console.log(error);
                        }            
                        else
                        {
                           console.log('Message Send Successfully: ' + info.response);
                           req.flash('success','Your Message Send Successfully');            
                           res.redirect('/Template/contact');                        
                        }
                    });
});

    var upload = multer(
    {
    storage: multer.diskStorage(
    {
      destination: function (req, file, callback)
      {
        callback(null, "./uploads");
      },
      filename: function (req, file, callback)
      {
        callback(null, file.originalname);
      },
    }),
  
    fileFilter: function (req, file, callback)
    {
      var ext = path.extname(file.originalname);
      if (ext !== ".png" && ext !== ".jpg" && ext !== ".gif" && ext !== ".jpeg")
      {
        return callback(null, false);
      }
      callback(null, true);
    },
  });
  
  router.post("/post", upload.any(), (req, res) =>
  {
    console.log("req.body"); //form fields
    console.log(req.body);
    console.log("req.file");
    console.log(req.files); //form files
    
    if (!req.body && !req.files)
    {
      res.json({ success: false });
    }
    else
    {
        var today = new Date();
        var yyyy = today.getFullYear();
        let mm = today.getMonth() + 1; // Months start at 0!
        let dd = today.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

       var today1 = dd + '/' + mm + '/' + yyyy;

      var details = new Details(
      {
        Post_title: req.body.post_title,
        Post_image: req.files[0].filename,
        Post_comment: req.body.post_comment,
        new_price: req.body.newprice,
        old_price: req.body.oldprice,
        Date: today1,
      });
  
      details.save((err, neel) =>
      {
        if (err)
        {
          console.log(err);
        }
        else
        {
           req.flash('success','Your image uploaded Successfully');    
           res.render("imagePost");
        }
      });
    }
  });
  
  router.get("/gallery", (req, res) =>
  {
    Details.find({}, (err, data) =>
    {
      if (err)
      {
        console.log(err);
      }
      else
      {
        res.render("gallery", { data: data });
      }
    });
  });

router.get("/order/:id",isLogin,(req,res)=>
{   
    var id = req.params.id;       
    Details.findOne({_id : id}, function(err, docs)
    {
        if(Boolean(docs))
        {
           res.render("home",{key:Publishable_Key,id:docs._id,title:docs.Post_title, price:docs.new_price*100, description:docs.Post_comment});   
        }
        else
        {
            console.log("No Data Found");
            res.redirect('/gallery');
        }
    }); 
});
  
  router.get("/purchase/:ids", (req, res) =>
  {
      var id = req.params.ids;   
      Details.findOne({_id : id}, function(err, data)
      {
          if (err)
          {
            console.log(err);
          }
          else
          {
            console.log(data.post_title);
            res.render("description", { data: data });
          }
        });
});

router.get("/myOrder", isLogin, (req, res) =>
  {
    const email = req.session.userEmail;

    order.find({email:email}, function(err, docs)
    {
        res.render("orderPage",{ data: docs }); 
    });
  });

router.post("/payment/:id",isLogin,(req,res)=>
{
        var id = req.params.id;
        var picTitle;
        var picImage;
        var picDescription;
        var picPrice;

        Details.findOne({_id : id}, function(err, docs)
        {
             picTitle=docs.Post_title;
             picImage=docs.Post_image;
             picDescription=docs.Post_comment;
             picPrice=docs.new_price;
        });

       
                stripe.customers.create(
                    { 
                        email: req.body.stripeEmail,
                        source: req.body.stripeToken
                    }) 
                .then((customer) =>
                {
                    return stripe.charges.create(
                    { 
                        amount: picPrice,
                        description: picDescription,
                        currency: 'INR', 
                        customer: customer.id 
                    }); 
                }) 
                .then((charge) =>
                { 
                    console.log("Congratulations"); 
                    var today = new Date();
                    var yyyy = today.getFullYear();
                    let mm = today.getMonth() + 1; // Months start at 0!
                    let dd = today.getDate();

                    if (dd < 10) dd = '0' + dd;
                    if (mm < 10) mm = '0' + mm;

                    var today1 = dd + '/' + mm + '/' + yyyy; 

                    const newOrder=new order({email: req.body.stripeEmail, title: picTitle,image:picImage,description:picDescription,price:picPrice,Date:today1});
                    
                    var ids = newOrder._id ;

                    newOrder.save();
         
                    var fname = req.body.fname;
                    var lname = req.body.lname;
                    var address = req.body.address;
                    var email = req.body.email;
                    var phone = req.body.phone;
                    var pin = req.body.pin;
                    var addt = req.body.additional;
                    
                    const shipped =  new shipping({order_id:ids,first_name:fname,last_name:lname,address:address,email:email,phone:phone,pin:pin,additional:addt,order_status:"Processing"});
                    shipped.save();
                    res.redirect('/paymentsuccess/');
                    
                    // const hello =  newOrder.save();
                    // res.redirect('/myOrder?email='+req.body.stripeEmail);
                }) 
                .catch((err) =>
                { 
                    res.send(err)	
                }); 

});

router.get("/paymentsuccess", (req, res)=>
{
    res.render("paymentsuccess");
});

router.get("/orderdetail/:id", isLogin, (req, res)=>
{
    var ids = req.params.id;
    var data;
    shipping.findOne({order_id : ids}, function(err, docs)
      {
          if (err)
          {
            console.log(err);
          }
          else
          {
            data = docs ;
          }
        });

    order.findOne({_id : ids}, function(err, docs)
      {
          if (err)
          {
            console.log(err);
          }
          else
          {
            console.log(data);
            res.render("shippingdetails", { data: data, order:docs });
          }
        });
    
});

router.get("*", (req, res)=>
{
    res.render("404error");
});

module.exports = router;
