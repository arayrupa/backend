const axios = require("axios");

// Send WhatsApp Message
async function sendWhatsAppMessage(whatsapp_no, name) {
  try {
    const data = {
      messaging_product: "whatsapp",
      to: "91" + whatsapp_no,
      type: "template",
      template: {
        name: "signup_message_first_time_login",
        language: { code: "en" },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: { link: "https://www.snapfinds.co.in/images/snapfind_signup.jpeg" },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: name },
              { type: "text", text: "https://snapfinds.co.in/app/job-listing.php" },
            ],
          },
        ],
      },
    };

    await axios.post("https://graph.facebook.com/v18.0/344725595388504/messages", data, {
      headers: {
        Authorization: "Bearer EAAUs4H8u7XoBO7O4omevjxAZAzSLKyWhSqwO9w8nxJnVmwQI1J8glWloxtOckKEk62FHXzU3cJZCbhJpArGCJ1IoCnPap2HDVBrWy9LJyLTUuAoqKBuFjGsGZBVDLSBANZBxPea5S0G1VZAJFBzGQFTw78la43CxmwH65miPegxZCFayrLQsIzo6ZCQsaUpZC8Kg",
        "Content-Type": "application/json",
      },
    });

    console.log("WhatsApp message sent to:", whatsapp_no);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error.response ? error.response.data : error.message);
  }
}

module.exports = sendWhatsAppMessage;
