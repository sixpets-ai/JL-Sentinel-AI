const apiKey = "0xQNJioGQ-9M_DfRwVzrxYgmK8bYN5jVvuroweKnIYkE"; // <-- BORRA ESTO Y PEGA TU API KEY DE IBM

fetch("https://iam.cloud.ibm.com/identity/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`,
})
  .then((res) => res.json())
  .then((data) => {
    if (data.access_token) {
      console.log(
        "\n✅ COPIA ESTE TOKEN LARGUISIMO:\n",
        data.access_token,
        "\n",
      );
    } else {
      console.log("❌ Error:", data);
    }
  })
  .catch((err) => console.error(err));
