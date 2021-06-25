import cors from "cors";
import consola from "consola";
import express from "express";
import mongoose from "mongoose";
import { json } from "body-parser";

//Import applications constants

import { DB, PORT } from "./constants";

//Initialize express application
const app = express();

//Apply application middlewares
app.use(cors());
app.use(json());

const main = async () => {
  try {
    //connect with database
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
    });
    consola.success("Database Connected...");
    //Start application listening for request on server
    app.listen(PORT, () => consola.success(`server started on port ${PORT}`));
  } catch (err) {
    consola.error(`unable to start the server \n${err.message}`);
  }
};

main();
