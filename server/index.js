import express from "express";
import AWS from "aws-sdk";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const rekognition = new AWS.Rekognition();

app.post("/detect", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const buffer = Buffer.from(imageBase64, "base64");

    const params = {
      Image: { Bytes: buffer },
      SummarizationAttributes: {
        MinConfidence: 70,
        RequiredEquipmentTypes: ["HEAD_COVER", "HAND_COVER", "FACE_COVER"],
      },
    };

    const result = await rekognition
      .detectProtectiveEquipment(params)
      .promise();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Detection failed", details: err });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
);
