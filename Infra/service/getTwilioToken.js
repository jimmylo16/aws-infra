// Send a json with the key user and key room to get the token
export const getTwilioToken = async function (
  user,
  room,
  { axios, twilioApiKey }
) {
  if (!user && !room) {
    return {
      body: "bad request",
      statusCode: 400,
    };
  }
  const url = `https://services.helixvm.com/Video/`;

  const twilioInstance = axios.create({
    baseURL: url,
  });
  const response = await twilioInstance({
    method: "get",
    url: `chat/?user=${user}&room=${room}`,
    headers: {
      "Content-Type": "application/json ; charset=UTF-8",
      Accept: "application/json",
      ["Access-Control-Request-Headers"]: "*",
      ["Access-Control-Request-Method"]: "*",
      ["x-api-key"]: twilioApiKey,
    },
  });

  return {
    body: JSON.stringify(response.data),
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  };
};
