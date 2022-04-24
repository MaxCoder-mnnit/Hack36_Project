const express=require('express');
const app=express();
const path=require('path');
const bodyparser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');


require('dotenv').config();
require('mongoose');
require('./models/conn');

app.set("view engine","ejs");
app.use(flash());
app.set('views',path.join(__dirname , '/Template'));

app.use(express.static(__dirname + '/public'));

app.use(methodOverride('_method'));
app.use(bodyparser.urlencoded({extended: true}));
app.use(bodyparser.json());
app.use(session({secret: 'HelloThisIsAsmitMohan', resave: false, saveUninitialized: true,

cookie:
{
    name:'LaudedArts',
    httpOnly:true,
    expires:Date.now() + 1000*60*60*24*7,  /*Setting to clear cookies after 7 days automatically*/
    maxAge:1000*60*60*24*7    /*Life of cookie :- 7 days from date creation*/
}
}));

const routes = require('./Routes/route');

app.use('/',routes);

app.listen(3000,()=>
{
    console.log("Listening to port 3000");
});

/*4242424242424242*/