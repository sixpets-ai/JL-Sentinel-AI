const token =
  "eyJraWQiOiIyMDI2MTAwODA4MjkiLCJhbGciOiJSUzI1NiJ9.eyJpYW1faWQiOiJJQk1pZC02OTMwMDFOTVlRIiwiaWQiOiJJQk1pZC02OTMwMDFOTVlRIiwicmVhbG1pZCI6IklCTWlkIiwianRpIjoiOWM5NGNjMDgtNjc4Yi00Y2NmLTg0YzUtNDYzNzkzMzM5YWVjIiwiaWRlbnRpZmllciI6IjY5MzAwMU5NWVEiLCJnaXZlbl9uYW1lIjoiSm9zZSIsImZhbWlseV9uYW1lIjoiU2llcnJhIiwibmFtZSI6Ikpvc2UgU2llcnJhIiwiZW1haWwiOiJ0cmFiYWpvc2U4N0BnbWFpbC5jb20iLCJzdWIiOiJ0cmFiYWpvc2U4N0BnbWFpbC5jb20iLCJhdXRobiI6eyJzdWIiOiJ0cmFiYWpvc2U4N0BnbWFpbC5jb20iLCJpYW1faWQiOiJJQk1pZC02OTMwMDFOTVlRIiwibmFtZSI6Ikpvc2UgU2llcnJhIiwiZ2l2ZW5fbmFtZSI6Ikpvc2UiLCJmYW1pbHlfbmFtZSI6IlNpZXJyYSIsImVtYWlsIjoidHJhYmFqb3NlODdAZ21haWwuY29tIn0sImFwaWtleV91dWlkIjoiQXBpS2V5LWNhZGE2NzY5LTQ0YzktNDUyMi1iM2I3LTA3NDNlMmZkZTAxMiIsImFjY291bnQiOnsidmFsaWQiOnRydWUsImJzcyI6Ijg3MWIwZjQ4MTViMjQ0ODQ5MDBkNDE3NjQwMjViMWE4IiwiaW1zX3VzZXJfaWQiOiIxNjI1MjMxNCIsImZyb3plbiI6dHJ1ZSwiaW1zIjoiMzIxNzgyMSJ9LCJpYXQiOjE3OTM5MzUyNTAsImV4cCI6MTc5MzkzODg1MCwiaXNzIjoiaHR0cHM6Ly9pYW0uY2xvdWQuaWJtLmNvbS9pZGVudGl0eSIsImdyYW50X3R5cGUiOiJ1cm46aWJtOnBhcmFtczpvYXV0aDpncmFudC10eXBlOmFwaWtleSIsInNjb3BlIjoiaWJtIG9wZW5pZCIsImNsaWVudF9pZCI6ImRlZmF1bHQiLCJhY3IiOjEsImFtciI6WyJwd2QiXX0.B_a98drw7isf2f3Z7M4KoYm-g0X5AflYm7iNb11rikHOT-ThcnBZk__UuZB-o4rFF6HDhkV-8xW5wptpdtuoJovfwe7ij74htBMU97E-OfPyyR8nVKbMWyO6dYzstW2XZHS6u_6TUTNfC3fUKzHOHm52c8YYekFdhXAYBTwIM2rBYgVED6kN_g_lIrXcyZIPJKXnrt5qIhiqNmWALsXaLgTBu1yt9Hg3fJ492cNvpJOOjoqsc134-rf3dym9WblyeDIE1_KNBIykKxKtzhQKcQKJEuNbqtPpNRgQ9FZfB4H7qrabQpzCUFbPdmHMnAd0F8oc3EqLVXkCD4zLQ4DeIA";
const instanceId = "3874bb6c-2101-4823-abff-34c6214c7290";

fetch(
  `https://api.aiopenscale.cloud.ibm.com/${instanceId}/v2/data_marts?version=2025-09-10`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "SANTI-DataMart-Mundial",
      description: "Data Mart para la gobernanza de SANTI Nexus",
      internal_database: true,
    }),
  },
)
  .then(async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.log("\n❌ ERROR REAL DE IBM (Respuesta en HTML):");
      console.log(text);
      return null;
    }
  })
  .then((data) => {
    if (data && data.id) {
      console.log(
        "\n✅ DATA MART CREADO. ESTE ES TU DATA_SET_ID:\n",
        data.id,
        "\n",
      );
    } else if (data) {
      console.log("❌ Error:", data);
    }
  })
  .catch((err) => console.error(err));
