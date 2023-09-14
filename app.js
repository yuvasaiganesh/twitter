const express = require("express");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializerDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error:${error.message}`);
  }
};

initializerDBAndServer();

const authenticateToken = (request, response, next) => {
  const { tweet } = request.body;
  const { tweetId } = request.params;
  let jwtToken;
  const authenticationHeader = request.headers["authorization"];
  if (authenticationHeader !== undefined) {
    jwtToken = authenticationHeader.split("")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
        request.tweetId = tweetId;
        request.tweet = tweet;
        next();
      }
    });
  }
};

app.post("/register", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username= '${username}';`;
  console.log(username, password, name, gender);
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
            INSERT INTO
            user(name ,username,password,gender)
            VALUES(
                '${name}',
                '${username}',
                '${hashedPassword}',
                '${gender}'
                )
                ;`;
      await db.run(createUserQuery);
      respond.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username= '${username}';`;
  console.log(username, password);
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const jwtToken = jwt.sign(dbUser, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const getTweetsFeedQuery = `
       SELECT
       username,
       tweet,
       date_time AS dateTime
       From
        follower INNER JOIN tweet ON  follower.following_user_id=tweet.user_id INNER JOIN user ON user.user_id=follower.following_user_id
        WHERE
        follower.follower_user_id=${user_id}
        ORDER BY
         data_time DESC
         LIMIT 4
         ;`;
  const tweetFeedArray = await db.all(getTweetsFeedQuery);
  response.send(tweetFeedArray);
});

app.get("/user/following", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const userFollowsQuery = `
       SELECT
       name,
      From
        user INNER JOIN follower ON  user.user_id=followers.following_user_id 
        WHERE
        follower.follower_user_id=${user_id}
        ;`;
  const userFollowsArray = await db.all(userFollowsQuery);
  response.send(userFollowsArray);
});

app.get("/user/followers", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const userFollowersQuery = `
       SELECT
       name,
      From
        user INNER JOIN follower ON  user.user_id=followers.following_user_id 
        WHERE
        follower.follower_user_id=${user_id}
        ;`;
  const userFollowersArray = await db.all(userFollowersQuery);
  response.send(userFollowersArray);
});

app.get("/tweets/tweetsId", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, tweetId);
  const tweetsQuery = `SELECT * FROM tweet WHERE tweet_id=${tweets};`;
  const tweetResult = await db.all(userFollowersQuery);
  response.send(tweetsQuery);
  const userFollowersQuery = `
       SELECT
       *,
      From
        follower INNER JOIN user ON  user.user_id=followers.following_user_id 
        
        WHERE
          follower.follower_user_id=${user_id}
        ;`;
  const userFollowers = await db.all(userFollowersQuery);

  if (
    userFollowers.some(
      (item) => item.following_user_id === tweetsResults.user_id
    )
  ) {
    console.log(tweetsResult);
    console.log("------");
    console.log(userFollowers);
    const getTweetDetailsQuery = `
                SELECT
                tweet,
                COUNT(DISTINCT(like.like_id) AS likes,
                 COUNT(DISTINCT(reply.reply_id) AS replies
                 tweet.date_time AS dateTime
                 FROM
                  tweet INNER JOIN like ON tweet.tweet_id=like.tweet_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
                  WHERE
                  tweet.tweet_id=${tweetId} AND tweet.user_id=${userFollowers[0].user_id}
                  ;`;
    const tweetDetails = await db.get(getTweetDetailsQuery);
    response.send(tweetDetails);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

app.get(
  "/tweets/:tweetId/likes",
  authenticateToken,
  async (request, response) => {
    const { payload } = request;
    const { tweetId } = request;
    const { user_id, name, username, gender } = payload;
    console.log(name, tweetId);
    const getLikedUserQuery = `
      SELECT
      *
      FROM
      follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id INNER JOIN like ON like.tweet_id=tweet.tweet_id
      INNER JOIN user ON user.user_id=likes.user_id
      WHERE 
      tweet.tweet_id=${tweetId} AND follower.follower_user_id=${user_id}
      ;`;
    const likedUsers = await db.all(getLikedUsersQuery);
    console.log(likedUsers);
    if (likedUsers.length !== 0) {
      let likes = [];
      const getNamesArray = (likedUsers) => {
        for (let item of likedUsers) {
          likes.push(item.username);
        }
      };
      getNamesArray(likedUsers);
      response.send({ likes });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

app.get(
  "/tweets/:tweetId/replies",
  authenticateToken,
  async (request, response) => {
    const { payload } = request;
    const { tweetId } = request;
    const { user_id, name, username, gender } = payload;
    console.log(name, tweetId);
    const getRepliedUserQuery = `
      SELECT
      *
      FROM
      follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
      INNER JOIN user ON user.user_id=reply.user_id
      WHERE 
      tweet.tweet_id=${tweetId} AND follower.follower_user_id=${user_id}
      ;`;
    const repliedUsers = await db.all(getRepliedUserQuery);
    console.log(repliedUsers);
    if (repliedUsers.length !== 0) {
      let replies = [];
      const getNamesArray = (repliedUsers) => {
        for (let item of repliedUsers) {
          let object = {
            name: item.name,
            reply: item.reply,
          };
          replies.push(object);
        }
      };
      getNamesArray(repliedUsers);
      response.send({ replies });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

app.get("/user/tweets", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const getTweetsDetailsQuery = `
       SELECT
       tweet,
      COUNT(DISTINCT(like.like_id) AS likes,
      COUNT(DISTINCT(reply.reply_id) AS replies
     tweet.date_time AS dateTime
      From
        user INNER JOIN tweet ON  user.user_id=tweet.user_id INNER JOIN like ON like.tweet_id=tweet.tweet_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
        WHERE
        user.user_id=${user_id}
        GROUP BY
        tweet.tweet_id
        ;`;

  const tweetDetails = await db.all(getTweetsDetailsQuery);
  response.send(tweetDetails);
});

app.post("/user/tweets", async (request, response) => {
  const { tweet } = request;
  const { tweetId } = request;
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, tweetId);
  const postTweetQuery = ` 
    INSERT INTO
    tweet(tweet,user_id)
    VALUES(
        '${tweet}',
        '${user_id}
        )
        ;`;
  await db.run(postTweetQuery);
  response.send("Created a Tweet");
});

app.delete("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { tweetId } = request;
  const { user_id, name, username, gender } = payload;
  const selectUserQuery = `SELECT * FROM tweet WHERE tweet.user_id=${tweetId} AND follower.follower_user_id=${user_id};`;
  const tweetUser = await db.all(selectUserQuery);
  if (selectUserQuery.length !== 0) {
    const deleteTweetQuery = `
          DELETE FROM tweet
          WHERE
          tweet.user_id=${user_id} AND tweet.tweet_id=${tweetId}
          ;`;
    await db.run(deleteTweetQuery);
    response.send("Tweet Removed");
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

module.exports = app;
