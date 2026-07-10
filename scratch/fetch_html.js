async function fetchHtml() {
  const res = await fetch("https://hotel-production--hotel-vantage.us-east4.hosted.app/login");
  const text = await res.text();
  console.log(text.includes("AIzaSyD-6x"));
}
fetchHtml();
