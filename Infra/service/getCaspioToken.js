export const getCaspioToken = async function ({ axios, caspioToken }) {
  const baseURL = "https://c2axa237.caspio.com";
  const caspioAxiosInstance = axios.create({
    baseURL: baseURL,
  });
  const response = await caspioAxiosInstance({
    method: "post",
    url: "/oauth/token",
    data: caspioToken,
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
