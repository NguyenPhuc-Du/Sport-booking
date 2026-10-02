const monsgoose = require("mongoose");

module.exports.connect = async () => {
    try {
        await monsgoose.connect(process.env.MONGODB_URL);
        console.log("Connected");
    } catch (error) {
        console.log("Failed Connected");
    }
}