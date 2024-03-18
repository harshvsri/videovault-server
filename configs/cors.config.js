/** Allowed Origins
 * Handles requests from a frontend web application.
 * This file sets up CORS configuration options for the backend server, which ensures that requests are only allowed from specified origins and credentials are properly handled.
 */
const allowedOrigins = ["https://happy-pebble-08b779700.5.azurestaticapps.net", "http://localhost:3000", "http://localhost:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  // Add the 'Access-Control-Allow-Origin' header
  exposedHeaders: ['Access-Control-Allow-Origin'],
};

module.exports = corsOptions;
