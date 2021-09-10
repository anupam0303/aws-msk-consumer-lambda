const axios = require("axios");

exports.handler = async (event) => {
  console.log("Event records: " + event.records);
  for (let key in event.records) {
    console.log("Key: ", key);
    return Promise.all(
      event.records[key].map(async (record) => {
        const msg = Buffer.from(record.value, "base64").toString();
        console.log("Message:", msg);
        try {
          const res = await axios.post(
            "https://bjol69u3c1.execute-api.eu-west-1.amazonaws.com/prod/shoppingcart",
            msg,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          console.log("response is: " + res.data);
          return {
            statusCode: 200,
            body: JSON.stringify(res.data),
          };
        } catch (e) {
          console.log("Error is: " + e);
          return {
            statusCode: 403,
            body: JSON.stringify(e),
          };
        }
      })
    );
  }
};
