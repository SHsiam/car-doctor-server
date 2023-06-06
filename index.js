const express = require('express')
const app = express()
var cors = require('cors')
require('dotenv').config()
var jwt = require('jsonwebtoken');
const port =process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors())
app.use(express.json());




const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.jvbgqui.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//verify JWT

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
      return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
      if(err){
          return res.status(401).send({error: true, message: 'unauthorized access'})
      }
      req.decoded = decoded;
      next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollections = client.db("carsDoctor").collection("services");
    const bookingCollection = client.db('carsDoctor').collection('bookings');

    //JWT SETUP
      app.post('/jwt',(req,res)=>{
        const user=req.body;
        const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });
        console.log(token);
        res.send({token});
      })

    //SERVICE ALL DATA FIND
    app.get('/services', async (req,res)=>{

      //ascending and descending order
      const sort = req.query.sort;
            const search = req.query.search;
            console.log(search);
            // const query = {};
            // const query = { price: {$gte: 50, $lte:150}};
            // db.InspirationalWomen.find({first_name: { $regex: /Harriet/i} })
            const query = {title: { $regex: search, $options: 'i'}}
            const options = {
                // sort matched documents in descending order by rating
                sort: { 
                    "price": sort === 'asc' ? 1 : -1
                }
                
            };
        const cursor =serviceCollections.find(query,options);
        const result=await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)};
        const options = {
            // Include only the `title` and `imdb` fields in the returned document
            projection: {title: 1, price: 1, service_id: 1,img:1 },
          };
        const result=await serviceCollections.findOne(query,options)
        res.send(result);
    })
      // bookings 

      //this is for some data
      app.get('/bookings', verifyJWT,async (req, res) => {
        console.log(req.query.email);
        const decoded = req.decoded;
            console.log('came back after verify', decoded)

            if(decoded.email !== req.query.email){
                return res.status(403).send({error: 1, message: 'forbidden access'})
            }
        let query = {};
        if (req.query?.email) {
            query = { email: req.query.email }
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
    })

      app.post('/bookings',async(req,res)=>{
        const booking=req.body;
        console.log(booking);
        const result=await bookingCollection.insertOne(booking);
        res.send(result);
      })

      app.patch('/bookings/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedBooking = req.body;
        console.log(updatedBooking);
        const updateDoc = {
            $set: {
                status: updatedBooking.status
            },
        };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
    })

      app.delete('/bookings/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Car Doctor')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})