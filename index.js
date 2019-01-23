const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dbConfig = require('./knexfile');
const knex = require('knex');
const jwt = require('jsonwebtoken');

const db = knex(dbConfig.development);

const server = express();
server.use(helmet());
server.use(cors());
server.use(express.json());
const secret = 'tokeen';

function generateToken(user) {
    const payload = {
        username: user.username,
    };
    const options = {
        expiresIn: '1h',
        jwtid: '12345'
    };
    return jwt.sign(payload, secret, options);
}

server.get('/', (req, res) => {
    res.send('Application running');
});

server.post('/api/register', (req, res) => {
  const creds = req.body;
  const hash = bcrypt.hashSync(creds.password, 10);
  creds.password = hash;

  db('users')
  .insert(creds)
  .then(ids => {
      const id = ids[0];

      db('users')
      .where({ id })
      .first()
      .then(user => {
          const token = generateToken(user)
          res.status(201).json({id: user.id, token});
      })
      .catch(err => res.status(500).send(err));
  })
  .catch(err => res.status(500).send(err));
});

function protected(req, res, next) {
    const token = req.headers.authorization;
    if(token) {
        jwt.verify(token, secret, (err, decodedToken) => {
            if(err) {
                res.status(401).json({ message: 'Invalid Token'});
            } else {
               req.username = decodedToken.username;
               next();
            }
        });
    } else {
        res.status(401).json({ message: 'No token provided' })
    }
}

server.post('/api/login', (req, res) => {
   const creds = req.body;

   db('users')
   .where({username: creds.username})
   .first()
   .then(user => {
       if (user && bcrypt.compareSync(creds.password, user.password)) {
           const token = generateToken(user);
           res.status(200).json({ token });
       } else {
           res.status(401).json({ message: 'You shall not pass!' });
       }
   })
   .catch(err => res.status(500).send(err));
});

server.get('/api/users',protected, (req, res) => {
  db('users')
    .select('id', 'username', 'password')
    .then(users => {
        res.json(users);
    })
    .catch(err => res.send(err));
});

server.post('/api/logout', (req, res) => {
    
});

server.listen(9000, () => {
    console.log('App running on port 9000')
})