import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/dbConnection.js";

dotenv.config();

// db connection
connectDB();

const app = express();

// middleware
app.use(express.json());
app.use(cors);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
