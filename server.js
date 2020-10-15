import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import mongoData from './mongoData.js'
import Pusher from 'pusher'

// App Config
const app = express()
const port = process.env.PORT || 8000

var pusher = new Pusher({
    //TODO: Add your own Pusher app credentials

});

// Middlewares
app.use(express.json())
app.use(cors())

// DB Config
const dbCredential = {
    //TODO: User your mongodb credentials
    dbuser: "",
    dbpassword: ""
};

const dbURI = `mongodb+srv://${dbCredential.dbuser}:${dbCredential.dbpassword}@database.oxfca.gcp.mongodb.net/discorddb?retryWrites=true&w=majority`
mongoose.connect(dbURI, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
})

mongoose.connection.once('open', () => {
    console.log('Database Connected')
    const changeStream = mongoose.connection.collection('conversations').watch()

    changeStream.on('change', (change) => {
        if (change.operationType === 'insert') {
            pusher.trigger('channels', 'newChannel', {
                'change': change
            });
        } else if (change.operationType == 'update') {
            pusher.trigger('conversation', 'newMessage', {
                'change': change
            });
        } else {
            console.log('Error triggering Pusher')
        }
    })
})

// API routes
app.get('/', (req, res) => res.status(200).send('Hello!!'))

app.post('/new/channel', (req, res) => {
    const dbData = req.body
    mongoData.create(dbData, (err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(201).send(data)
        }
    })
})

app.get('/get/channelList', (req, res) => {
    mongoData.find((err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            let channels = []
            data.map((channelData) => {
                const channelInfo = {
                    id: channelData._id,
                    name: channelData.channelName
                }
                channels.push(channelInfo)
            })
            res.status(200).send(channels)
        }
    })
})

app.post('/new/message', (req, res) => {
    const newMessage = req.body

    mongoData.updateMany(
        { _id: req.query.id },
        { $push: { conversation: req.body } },
        (err, data) => {
            if (err) {
                console.log('Error saving message...')
                console.log(err)
                res.status(500).send(err)
            } else {
                res.status(201).send(data)
            }
        }
    )
})

app.get('/get/data', (req, res) => {
    mongoData.find((err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})

app.get('/get/conversation', (req, res) => {
    const id = req.query.id
    mongoData.find({ _id: id }, (err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})

// Listen
app.listen(port, () => console.log(`listening on localhost:${port}`))