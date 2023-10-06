import axios from "axios";

const twilioApiKey = process.env.TWIGLIO_APPKEY;
const caspioToken = process.env.CASPIO_TOKEN;

import { getCaspioToken } from "./getCaspioToken.js";
import { getTwilioToken } from "./getTwilioToken.js";

export const handler = async function (event, context) {
  console.log({ event });
  const { queryStringParameters, resource } = event;

  try {
    if (resource === "/caspio") {
      return getCaspioToken({ axios, caspioToken });
    }
    if (resource === "/twilio") {
      const { room, user } = queryStringParameters;
      return getTwilioToken(user, room, { axios, twilioApiKey });
    }
  } catch (error) {
    console.log(error);
  }

  return {
    body: "ok",
    statusCode: 200,
  };
};
