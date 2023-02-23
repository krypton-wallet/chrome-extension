const express = require("express");
const db = require("./config/db");
const cors = require("cors");

const app = express();

const PORT = 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome." });
});

// Route to get all posts
app.get("/api/getAll", (req, res) => {
  db.query("SELECT * FROM transactions", (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get one post
app.get("/api/getFromPk/:pk", (req, res) => {
    const pk = req.params.pk;
    db.query("SELECT * FROM transactions WHERE pk = ?", pk, (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log('db get res: ', result)
      res.send(result);
    });
  });

// Route for creating the post
app.post("/api/create", (req, res) => {
  const pk = req.body.pk;
  const newpk = req.body.newpk;
  const thres = req.body.thres;
  const signed_cnt = req.body.signed_cnt;
  const transaction = req.body.transaction;
  const executor = req.body.executor;

  //console.log(pk, newpk, thres, signed_cnt, transaction);

  db.query(
    "INSERT INTO transactions (pk, newpk, thres, signed_cnt, transaction, executor) VALUES (?,?,?,?,?,?)",
    [pk, newpk, thres, signed_cnt, transaction, executor],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result);
      res.send(result);
    }
  );
});

// Route for update transaction
app.post("/api/update", (req, res) => {
    const pk = req.body.pk;
    const new_transaction = req.body.new_transaction;

    db.query(
      "UPDATE transactions SET signed_cnt = signed_cnt + 1, transaction = ? WHERE pk = ?",
      [new_transaction, pk],
      (err, result) => {
        if (err) {
          console.log(err);
        }
        console.log(result);
        res.send(result);
      }
    );
  });

// Route to delete a transaction
app.delete("/api/delete/:pk", (req, res) => {
  const pk = req.params.pk;

  db.query("DELETE FROM transactions WHERE pk= ?", pk, (err, result) => {
    if (err) {
      console.log(err);
    }
  });
});

/*
// Route for creating a pk to nonce pair
app.post("/api/createNonce", (req, res) => {
  const pk = req.body.pk;
  const nonce_pk = req.body.nonce_pk;

  //console.log(pk, newpk, thres, signed_cnt, transaction);

  db.query(
    "INSERT INTO nonces (pk, nonce_pk) VALUES (?,?)",
    [pk, nonce_pk],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result);
      res.send(result);
    }
  );
});

// Route to get nonce
app.get("/api/nonce/getFromPk/:pk", (req, res) => {
  const pk = req.params.pk;
  db.query("SELECT * FROM nonces WHERE pk = ?", pk, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});
*/

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
