const path = require("path");

module.exports = {
  entry: path.join(__dirname, "src", "index.js"),
  mode: "development",
  output: {
    filename: "bundle.js",
    path: path.join(__dirname),
  },
  devServer: {
    hot: true,
    static: {
      directory: path.join(__dirname),
    },
  },
};
