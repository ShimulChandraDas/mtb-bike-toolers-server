const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());

//mtb_bike_toolers
//98zNca8C9qYdjgkD



var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.cpgjv.mongodb.net:27017,cluster0-shard-00-01.cpgjv.mongodb.net:27017,cluster0-shard-00-02.cpgjv.mongodb.net:27017/?ssl=true&replicaSet=atlas-1iq4qi-shard-0&authSource=admin&retryWrites=true&w=majority`;
//console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//token verify 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!verifyJWT) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Access Forbidden' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        console.log("database connected");
        const toolsCollection = client.db("bike_toolers").collection("tools");
        const orderCollection = client.db("bike_toolers").collection("orders");
        const userCollection = client.db("bike_toolers").collection("users");
        const paymentCollection = client.db("bike_toolers").collection("payments");

        //payment
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']

            });
            res.send({ clientSecret: paymentIntent.client_secret })

        })
        //tools Load UI
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })
        //all users Load
        app.get('/user/', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        });

        //secure admin route
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })

            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        //Make Admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                res.status(403).send({ message: 'Access Forbidden' });
            }
        })






        //user data loaded
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        })

        //decrees quantity
        // app.get('/available', async (req, res) => {
        //     const stock = req.query.stock;
        //     const tools = await toolsCollection.find().toArray();


        //     const query = { stock: stock }
        //     const orders = await orderCollection.find(query).toArray();
        //     tools.forEach(tool => {
        //         const toolOrders = tools.filter(t => t.purchased === tool.name);
        //         const available = orders.stock - orders.orderQuantity
        //         console.log(available);
        //         //tool.ordered = toolOrders.map(q => q.stock);

        //     })

        //     res.send(tools)

        // })
        app.get('/order', verifyJWT, async (req, res) => {
            const customer = req.query.customer;
            const decodedEmail = req.decoded.email;
            if (customer === decodedEmail) {
                const query = { customer: customer };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders);
            } else {
                return res.status(403).send({ message: 'Access Forbidden' });
            }
        });

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,

                },
            };
            const result = await paymentCollection.insertOne(payment)
            const updatedOrdered = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        })


        //handle order
        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { purchased: order.purchased, purchasedId: order.purchasedId, customerName: order.customerName }
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            const result = orderCollection.insertOne(order);
            return res.send({ success: true, result });

        })



    } finally {

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from MTB Bike Toolers!')
})
app.get('/test', (req, res) => {
    res.send('Hello from Heroku test!')
})

app.listen(port, () => {
    console.log(`MTB Bike app listening on port ${port}`)
})