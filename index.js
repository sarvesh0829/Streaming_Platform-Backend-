const express = require('express')
const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3');
const cors = require("cors");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    credentials: true,
    origin: "*"
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

aws.config.update({
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    region: process.env.AWS_REGION,

});

const BUCKET = process.env.AWS_BUCKET
const s3 = new aws.S3();

const upload = multer({
    storage: multerS3({
        s3: s3,
        acl: "public-read",
        bucket: BUCKET,
        key: function (req, file, cb) {
            console.log(file);
            cb(null, file.originalname)
        }
    })
})

app.post('/upload', upload.single('file'), async function (req, res, next) {
    try {
        res.send('Successfully uploaded ' + req.file.location + ' location!')
    } catch (error) {
        res.send(`error: ${error.message}`)
    }
})

app.get("/list", async (req, res) => {
    try {
        let r = await s3.listObjectsV2({ Bucket: BUCKET }).promise();
        let x = r.Contents.map(item => item.Key);
        res.send(x)
    } catch (error) {
        res.send(`error: ${error.message}`)
    }
})

app.get("/stream/:filename", async (req, res) => {
    const filename = req.params.filename;
    const params = { Bucket: BUCKET, Key: filename };
    s3.getSignedUrl("getObject", params, (err, url) => {
        if (err) {
            console.error("Error generating streamable link:", err);
            res.status(500).send("Error generating streamable link");
        } else {
            res.header("Content-Type", "video/mp4");
            res.json({ filename: filename, url: url })
        }
    });
});

app.get("/download/:filename", async (req, res) => {
    try {
        const filename = req.params.filename
        let x = await s3.getObject({ Bucket: BUCKET, Key: filename }).promise();
        res.send(x)
    } catch (error) {
        res.send(`error: ${error.message}`)
    }
})

app.delete("/delete/:filename", async (req, res) => {
    try {
        const filename = req.params.filename
        await s3.deleteObject({ Bucket: BUCKET, Key: filename }).promise()
        res.send("File Deleted Successfully")
    } catch (error) {
        res.send(`error: ${error.message}`)
    }
})

app.listen(PORT, () => {
    console.log("Server is running on port " + PORT)
});