const mongoose = require("mongoose");

module.exports.connect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || process.env.DATABASE_URL, {
          monitorCommands: process.env.DEBUG_TIMING === "1",
        });
        console.log("Connected");
    } catch (error) {
        console.log("Failed Connected:", error.message);
    }
}
