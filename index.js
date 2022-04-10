const express = require('express');
// https://stackabuse.com/making-http-requests-in-node-js-with-node-fetch/
const fetch = require('node-fetch');
const redis = require('redis');

const PORT = process.env.PORT || 5000;
// defining our redis port
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);


//initializing express
const app=express();


//set reposnse function
function setResponse(username,repos){
 return `<h2>${username} has ${repos} Github repos</h2>`; 
}


//cache middleware
//middleware is a function which runs in beween request and response cycle
function cache(req, res, next) {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
}

// function to get data of the user we want to get repos of
// it will req to github for the data
async function getRepos(req,res,next){
    try{
        console.log("requset to fetch data..")
        // destructuring data
        const {username} = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`);    

        //for data in json
        const data = await response.json();
        const repos= data.public_repos;

        //setting data to redis
        // way to do this we will use client that we initialized above
        // https://redis.io/commands/set/
        // Set key to hold the string value. If key already holds a value, it is overwritten, 
        // regardless of its type. Any previous time to live associated with the key is discarded on successful SET operation.
        // SET key value [EX seconds]
        // client.setEx(key,expiration,data )
        client.setEx(username,3600,repos);
        res.send(setResponse(username,repos));
    }
    catch(e){
        console.log(e)
        // status 500 represents server error
        res.status(500);
    }
}


app.get('/repos/:username', cache, getRepos);

app.listen(5000, () => {
  console.log(`App listening on port ${PORT}`);
});