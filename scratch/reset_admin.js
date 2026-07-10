const admin = require('firebase-admin');

const projectId = "hotel-vantage";
const clientEmail = "firebase-adminsdk-fbsvc@hotel-vantage.iam.gserviceaccount.com";
const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDk+tUmwBSe1CMq\n6uk8NXtVFEVP5o4jTXX98YTi8CajWLrdPcApdSxyPKuPt5hWzyANVz3J3R0ocfRT\nKeBPCICUwxuWaVoWYckdcGlk9SX2xLG9nm+2HXOUpQuT3SithGMxD2HRyE9y8F2R\nBJv+nHP8jyWCy9cHtvRlgjBF8doRBw+Po//Hjd6PoXizgvXHHXHrI7PimQUuTwmo\nNkXrVdbgvPy1SEDpUvAQRYld9iRxioAD25d3bm0xTnOwTWfRGCneB3Rw+EkP92ek\nHFfCyvt52/vqXYLRDP8t3/enrIZHFI2ODWideVNCxOKNv4ngsUsqbzeHUqb9DtIm\nH/PCDh2HAgMBAAECggEAFLBrSPSLCGzPfqW6DDQi4CWUO6tvxVXO5vKHGMAtJY4z\nWCEntzc8nFfKApLKo3FUipAK563gYBKnykna2BlDEO3uFLGRL7uHIe9Rvor98qWE\nD8d8fX58vn4JJUOS1NbE5Z5nrr5EG3UHZz58380AF95RO9eyJqLLw043kWJQW0BV\nyh0AmIETWlRRfLSNaP84MxQYWQ4449inZV2ceogUk5J0ICCFAjR/hsMTNDUnhDnR\nLKbAYlWv/yABwWIPI6p4XfQIppOxPJr3b+zU/t1FzMwPsEQxgs6XCHa+dfy6i0d3\qaHWXHeOcnzZM4qmQYQi0i8NkkoDOnStP2L2SnvrpQKBgQD7Fhpqel6I3blpjHjK\nDyGDemIeqgI2930afuChR84kocl4ZTRX/xT7TRnBcxD7bXN4mBhj6pr7+0UQpa4J\nYJsG1aE9nuqr2Kb0TMJ/dDy8TsSOqtT1dlal2D6feyiprZKu2BAtnzA443uI5X9v\nToJ8rr+HHWkQg32D0w74SPhNzQKBgQDpdfrSNywZN5LFEqz0/AawEKNYV+3xS09t\VYSDfryhKZ1ju9l/RGcU5PPiD5V5MggNpdOgy1u9Q8jNkhPK4LyZtXDYREeYwBIh\nHjq+JJDEy9tVoRIP5OvrsfDaE7EJwWN67SzZ4WNp395Bc6+3ebfRFbp26+4Pw7GG\n3pxxJ1LkowKBgQDwl7dsPCGFqGBYIUBE7cbBQ23t0B4bKX74+oaoRDPlqhlxghhs\nEYK7Yp/BXE7zfWdeMO9+Hnmv5o/BaeCgH6+tFttQPozDafBgu4TLuEfScO+rfUpe\ngqx4cgNfshW+sRGS9HpcHOOKP4BKJw67S1GBw7jG8YmRR03oGT+I7fLwKQKBgGwh\nGsTWjPQ5Cx9/4N+vAyH08tLuFuTVbrpDC5cj0hYLAjy5Oql5cwz4ZgTkFuUFSTmY\n/oXQ6nKkvJKJ/+TNZk0C/nsMVOTowPzZ1XdP1EVx7eqhKY53BtYpmlZHHI5aJcs/\norBfdf4JlBVYkaA3He4XVD/UUnS2vLiszmSSRBBlAoGAYdeh7blsatAwktSGlo63\nNDhwu2vMqhDicpy7Jdj5/PtB1FWV2e0/TJaZu9LhAaMJvaJSL7S1TAnF+s5ZFbs3\nDvkzGxlu50Eq2TFAziiZipnc8V34348C2wpGprKSifqQaIrDOB0+tmdl9vtp/gph\nKGMg8RrQvj7NL4kubv24aMg=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

async function reset() {
  const uid = 'USR-ADMIN';
  await admin.auth().updateUser(uid, {
    password: 'admin123'
  });
  console.log('✅ Password Reset to admin123 for USR-ADMIN');
  process.exit(0);
}

reset();
