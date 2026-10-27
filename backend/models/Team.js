const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: String,
  category: String,
  needed: String,
  members: [
    {
      type: String,
    },
  ],
  createdBy: String,
});

module.exports = mongoose.model("Team", teamSchema);
