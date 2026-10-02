const mongoose = require("mongoose");

module.exports.connect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected");
    } catch (error) {
        console.log("Failed Connected:", error.message);
    }
}
