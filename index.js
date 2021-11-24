const express=require('express');
const app=express();
const cors=require('cors');
require('dotenv').config();
const ObjectId=require('mongodb').ObjectId;
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const fileUpload = require('express-fileupload');

//defualt port
const port=process.env.PORT || 7000;


//middlewares

app.use(cors());
app.use(express.json());
app.use(fileUpload());



//connection uri to connect mongodb with server

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.byzxg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
           
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}


async function run(){

    try{
        //making connnection with database
        await client.connect();
        console.log("database connected");

         //creating database and collections
         const database = client.db('afiyas_perlour');
         const appointmentsCollection = database.collection('appointments');
         const userCollection = database.collection('user');
         const servicesCollection= database.collection('services');
         const reviewsCollection = database.collection('reviews');

           //api 
          //getting all services
         app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find({});
            const allservies = await cursor.toArray();
            res.json(allservies);
        });

        //services with their id
        app.get('/services/:id', async (req, res) => {
            const id=req.params.id;
            const query={_id:ObjectId(id)};
            const servic=await servicesCollection.findOne(query);

            
            res.json(servic);
        });
         //addding services to database
         app.post('/Addservices', async (req, res) => {
             const name = req.body.name;
            const price = req.body.price;
            const description=req.body.description;
            const pic = req.files.img;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const doctor = {
                name,
                price,
                img: imageBuffer,
                description
            }
            const serviceresult = await servicesCollection.insertOne(doctor);
            res.json(serviceresult);

        });

        //deleting services for buyings 
     app.delete('/deleteservice/:id',async (req,res)=>{
        const id=req.params.id;
        const query={_id:ObjectId(id)};
        const result=await servicesCollection.deleteOne(query);
        res.json(result);
    });

         //getting all appointments for
         app.get('/allappointments', async (req, res) => {
            const cursor = appointmentsCollection.find({});
            const allappointments = await cursor.toArray();
            res.json(allappointments);
        });

         //getting user all appointments
     app.get('/userAppoinment', async (req, res) => {
        const email = req.query.email;
        const query = { useremail: email }
        const cursor = appointmentsCollection.find(query);
        const userappoinments = await cursor.toArray();
        res.json(userappoinments);
    })
     

    //deleting appointment
    app.delete('/deleteaappoinment/:id',async (req,res)=>{
        const id=req.params.id;
        const query={_id:ObjectId(id)};
        const result=await appointmentsCollection.deleteOne(query);
        res.json(result);
    });


         //booking appointments  and adding it to the database
         app.post('/bookappoinment', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            console.log(result);
            res.json(result)
        });

        //adding review to database


          
           app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const allservies = await cursor.toArray();
            res.json(allservies);
        });

        //services with their id
        app.get('/reviews', async (req, res) => {
            const email = req.query.email;
        const query = { useremail: email }
        const cursor = reviewsCollection.find(query);
        const userreviews = await cursor.toArray();
        res.json(userreviews);
        });

         //addding services to database
         app.post('/addreviews', async (req, res) => {
             const addreview=req.body;
            const reviewresult =await reviewsCollection.insertOne(addreview);
            res.json(reviewresult);

            
        });

        //deleting services for buyings 
     app.delete('/deletereviews/:id',async (req,res)=>{
        const id=req.params.id;
        const query={_id:ObjectId(id)};
        const result=await reviewsCollection.deleteOne(query);
        res.json(result);
       });

 ///getting admins database
     app.get('/users/:email', async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    let isAdmin = false;
    if (user?.role === 'admin') {
        isAdmin = true;
    }
    res.json({ admin: isAdmin });


})


        //adding user data to databse
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
        })
        ///adding already exists users  data to database
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            console.log(filter);
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

 
           ////////////////////////////////making admin and giving 
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            console.log(user);
            const requester = req.decodedEmail;
           
            if (requester) {
               
                const requesterAccount = await userCollection.findOne({ email: requester });
                if (requesterAccount.role == 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await userCollection.updateOne(filter, updateDoc);
                    res.json(result);

                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })

    }

    finally {

    }
}






run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Welcome to Afiyas Beuty Perlour!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})

