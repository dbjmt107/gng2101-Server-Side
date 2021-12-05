



// insert twilioAuth and SID key below. replace x and xx
//const twilioAuth = "x"
//const twilioSID = "xx"

const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs');
const twilioClient = require("twilio")(twilioSID, twilioAuth);
const url = require('url')
const scedule = require('node-schedule')
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const { json } = require('express');
var admin = require("firebase-admin");
var count =0;
var id = 10;
var graceCIs =[];
var regularCIs = [];
var jobThing = [] ;


//insert path to Firebase admin key. replace xxx
//var serviceAccount = require("./xxx");
const {getDatabase}  = require('firebase-admin/database');
const { resolve } = require('path');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // replace xxxx with firebase url path below
  //databaseURL: "https://xxxx.firebaseio.com",
  databaseAuthVariableOverride: null
});

var db = getDatabase();
var userRef = db.ref("users")

count = getNextID();

const PORT = process.env.PORT || 5000
express()
  .use(express.json())
  .get('/', (req, res) =>{
    res.sendStatus(200)
  })
  
  .post('/test', (req, res) =>{  
    var bod = req.body;    
    res.sendStatus(200);
  })
  
  .post('/createUser', (req, res) =>{  
   
    var bod = req.body;
       var c = count ++;
    res.send(c)
    res.sendStatus(200);
    newUser(c, bod.name);

  })

  .post('/createContact', (req, res) =>{    
    var bod = req.body;
    res.sendStatus(200);
    setContact(bod.userID,bod.phoneNumber, bod.priority)

  })

  .post('/checkin', (req, res) =>{ 
    for(var i = 0; i<jobThing.length; i++){
      i.cancel();
    }
    
    
    res.sendStatus(200);
   
  })


  .post('/createCheckin', (req, res) =>{    
    var bod = req.body;
    res.sendStatus(200);
  
    createCheckins(bod.month,bod.day,bod.hour,bod.minute,bod.repeating, bod.dayOfWeek, bod.year, bod.userID, bod.graceHours, bod.graceMinutes)

  })
  
  
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

//schedule

function createCheckins(m, d, h, min, re, DOW, y, userID, gHour, gMin) {
  var strDate = "";
strDate = strDate.concat("0 ",min," ", h," ", d," ", m," ?")
if(re==false){
    var j = scedule.scheduleJob(strDate,() =>{ 
        gracePeriod(userID,gHour,gMin);
    });

}else{

    var l = scedule.scheduleJob(strDate,() =>{ 
        
        strDate = "";

        if (DOW.equals("all")){
          strDate = strDate.concat("0 ",min," ", h," ? * *")
        }else{
          var datee = new Date(y,m-1, d, h, min, 0, 0);        
          var i = datee.getDay();
          strDate = strDate.concat("0 ",min," ", h," ? * ",i)
        }
        
        l.cancel;
        
        var k = scedule.scheduleJob(strDate,() =>{ 
            

            gracePeriod(userID,gHour,gMin);       

    });
   

});

  
}
}

//grace period

async function gracePeriod(userID, gHours, gMin) {
  curDate = new Date();
  var addMili = gHours*3600000+gMin*60000;
  var mili = curDate.getTime();
  var finalMili = mili + addMili;
  var newDate =new Date(finalMili);


  var grace =  scedule.scheduleJob(newDate, async () =>{ 
    var c = await getContact(userID)
    var cUser = await getName(userID)

   
   sendText(cUser,c);


});
jobThing = grace;
graceCIs.push(grace);

setGraceCheckin(userID, grace);
}
  
  //database

  function newUser(userID, name) {
    var userRef = db.ref("users")
    userRef.child(userID).set({
        name: name,
       
    });
}
function setContact(userID, contact, p) {
    userRef.child(userID).child("contacts").child(contact).set({
        p
       
    });
}
function setRegCheckin(userID, checkin) {
    userRef.child(userID).child("checkins").child("reg").set({
        checkin
       
    });
}
function setGraceCheckin(userID, checkin) {
  var gName = checkin.name;
  userRef.child(userID).child("checkins").child("grace").set({
      gName
     
  });
}
async function getContact(user) {
  var re;
  await userRef.child(user).child("contacts").orderByChild('p').limitToFirst(1).once('value', (data)=>{
      var realData = data.val();
     
      var con =  Object.keys(realData)[0];
       re = con;
  })
  return re;
}
function getRegCheckin(userID) {
}
async function getGraceCheckinNames(userID) {
  var re;
 await userRef.child(userID).child("checkins").child("grace").once('value', (data)=>{
     var realData = data.val();
    
      re = Object.values(realData)
 })
 return re;

}
async function getName(userID) {
  var re;
  await userRef.child(userID).child("name").once('value', (data)=>{
   
     var realData =data.val();
 
     
     re = realData;
      
 })
return re;
}
async function getNextID() {
  var re
  await userRef.limitToLast(1).once('value',  (data)=>{

     var realData =  data.val();
     
     num =  Object.keys(realData)[0]
     
     re = num+1;
      
 })
 return re;
}


// text

function sendText(name, number) {
  var mesFinal
  var message = "This is an automated message to inform you that ";
  mesFinal = message.concat(name, " has missed their most recent check-in and has set you as an emergency contact to be notified when this occurs")


  var editNumber = "+";
  var numFinal
  if(number.length==10){
    numFinal = editNumber.concat("1",number)

  }else if(number.length==11){
    numFinal = editNumber.concat(number)
  }

  twilioClient.messages
  
  .create({
     body: mesFinal,
     // insert twilio phone number below. replace xxxxx
     from: 'xxxxx',
     to: numFinal
   })
  .then(message => console.log(message.sid));
  
}