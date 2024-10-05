const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto'); // For password hashing
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb'); // For MongoDB connection to Atlas

const app = express();
const port = process.env.PORT || 3107;

// MongoDB Atlas Connection URI and Client Setup
const uri = "mongodb+srv://AppleIcecream:Doz90854Xaz02296@applecluster.7rcuz.mongodb.net/?retryWrites=true&w=majority&appName=AppleCluster";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Connect to MongoDB Atlas using MongoClient
async function connectToMongoClient() {
    try {
        // Connect the client to the server
        await client.connect();

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB Atlas!");

        // Test: Insert a sample document into a test collection
        const db = client.db('testdb'); // Replace 'testdb' with your database name
        const collection = db.collection('testCollection'); // Replace 'testCollection' with your collection name
        
        const testDoc = { name: 'Test Document', value: 123 }; // Sample test document
        const result = await collection.insertOne(testDoc);
        console.log('Test document inserted with _id:', result.insertedId);

    } catch (error) {
        console.error('Failed to connect to MongoDB Atlas:', error);
    } finally {
        // Ensures that the client will close when finished or an error occurs
        await client.close();
    }
}

// Immediately run MongoDB Atlas connection
connectToMongoClient();

// Mongoose local MongoDB connection
mongoose.connect('mongodb://localhost:27017/techmate', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Connected to the local MongoDB database!");
});

// Define User Schema using Mongoose
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});

// Create User model
const User = mongoose.model('User', userSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Serve the login/signup page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'techmate-signin.html'));
});

// Serve the homepage after login
app.get('/homepage', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// Hashing function to securely store passwords
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Handle sign-up POST request
app.post('/signup', async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists.');
        }

        const newUser = new User({
            username,
            password: hashPassword(password)
        });

        await newUser.save();
        res.send('Sign-up successful! You can now <a href="/">login</a>.');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred during sign-up.');
    }
});

// Handle login POST request
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).send('User does not exist.');
        }

        const hashedPassword = hashPassword(password);
        if (user.password === hashedPassword) {
            return res.redirect('/homepage');
        } else {
            return res.status(401).send('Incorrect password.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred during login.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
