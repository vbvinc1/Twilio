// server.js
// Main backend file for the Twilio SMS Web Application

// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser'); // To parse incoming request bodies
const dotenv = require('dotenv'); // To manage environment variables
const twilio = require('twilio'); // Twilio Node.js SDK

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Retrieve Twilio credentials and phone number from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Validate that Twilio credentials are set
if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error(
    'Error: Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not set in the .env file.'
  );
  process.exit(1); // Exit the application if credentials are missing
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Middleware
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static('public')); // Serve static files from the 'public' directory

// --- API Endpoints ---

/**
 * @route POST /api/send
 * @description Endpoint to send an SMS message.
 * Expects JSON body with 'to' (recipient phone number) and 'message' (SMS content).
 */
app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;

  // Basic validation
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Recipient phone number and message are required.' });
  }

  try {
    // Send SMS using Twilio client
    const twilioResponse = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to, // Make sure 'to' is in E.164 format (e.g., +1234567890)
    });

    console.log('SMS sent successfully. SID:', twilioResponse.sid);
    res.json({ success: true, message: 'SMS sent successfully!', sid: twilioResponse.sid });
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    // Provide a more user-friendly error message if possible
    let errorMessage = 'Failed to send SMS.';
    if (error.code === 21211) { // Invalid 'To' Phone Number
        errorMessage = 'Invalid recipient phone number. Please ensure it includes the country code (e.g., +1234567890).';
    } else if (error.message) {
        errorMessage = error.message;
    }
    res.status(500).json({ success: false, error: errorMessage, details: error.message });
  }
});

/**
 * @route POST /sms
 * @description Twilio webhook endpoint for receiving incoming SMS messages.
 * Twilio will send POST requests to this URL when your Twilio number receives an SMS.
 */
app.post('/sms', (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const incomingMsg = req.body.Body; // Message content
  const fromNumber = req.body.From; // Sender's phone number

  console.log(`Incoming SMS from ${fromNumber}: ${incomingMsg}`);

  // You can add logic here to process the incoming message.
  // For example, reply with a message:
  // twiml.message('Thanks for your message! We received it.');

  // Respond to Twilio to acknowledge receipt of the message
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

// --- Serve the frontend ---
// This is handled by express.static('public') for index.html at the root

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Ensure your .env file is configured with Twilio credentials.');
  console.log(`Twilio webhook for incoming SMS should be set to: http://<your-ngrok-or-public-url>/sms`);
});
