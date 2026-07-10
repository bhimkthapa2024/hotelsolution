const apiKey = "AIzaSyD-6xLGxfq523vQu_ComhAzg5KGECaSlMg";
const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

async function testLoginWithReferer() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://hotel-production--hotel-vantage.us-east4.hosted.app/login'
    },
    body: JSON.stringify({
      email: "admin@property.com",
      password: "PASSWORD123",
      returnSecureToken: true
    })
  });
  
  const data = await res.json();
  console.log(data);
}

testLoginWithReferer();
