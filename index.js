const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');


const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());

//mtb_bike_toolers
//98zNca8C9qYdjgkD



var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.cpgjv.mongodb.net:27017,cluster0-shard-00-01.cpgjv.mongodb.net:27017,cluster0-shard-00-02.cpgjv.mongodb.net:27017/?ssl=true&replicaSet=atlas-1iq4qi-shard-0&authSource=admin&retryWrites=true&w=majority`;
//console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        console.log("database connected");
        const toolsCollection = client.db("bike_toolers").collection("tools");
        const orderCollection = client.db("bike_toolers").collection("orders");


        //tools Load UI
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })

        //decrees quantity
        // app.get('/available', async (req, res) => {
        //     const quantity = req.query.quantity;
        //     const tools = await toolsCollection.find().toArray();

        //     const query = { stock: stock }
        //     const orders = await orderCollection.find(query).toArray();
        //     res.send(orders)

        // })



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

app.listen(port, () => {
    console.log(`MTB Bike app listening on port ${port}`)
})