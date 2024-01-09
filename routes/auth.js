var jwt = require('jsonwebtoken');
var crypto = require('crypto');

var express = require('express');
var router = express.Router();

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

router.post('/auth/login', async function(req, res, next) {
  let user;
  let drive;

  const getUser = async () => {
    result = await prisma.user.findUnique({
      where: {
        login: req.body.login,
        password: req.body.password,
      }
    })
    user = result;
    return result;
  }
  const getDrive = async (u) => {
    if (u) {
      result = await prisma.drive.findFirst({
        where: {
          ownerUuid: u.uuid,
        }
      })
      drive = result;
      return result;
    } else {
      return null;
    }
  }
  
  try {
    await getUser()
    .then(async result => (await getDrive(result)))
    .then(() => {
      if (user && drive) {
        const accessToken = jwt.sign({ uuid: user.uuid }, process.env.ACCESS_TOKEN_SECRET);
        return res.send({ userUuid: user.uuid, login: user.login, accessToken, driveUuid: drive.uuid });
      } else {
        return res.sendStatus(404);
      }  
    })
    .catch(() => {
      return res.sendStatus(404)
    })
  } catch (e) {
    return res.sendStatus(404);
  }
});

router.post('/auth/signup', async function(req, res, next) {
  try {
    let userUuid = crypto.randomUUID();
    Promise.all([
      await prisma.user.create({
        data: {
          uuid: userUuid,
          login: req.body.login,
          password: req.body.password,
        },
      }),
      await prisma.drive.create({
        data: {
          uuid: crypto.randomUUID(),
          ownerUuid: userUuid,
          spaceTotal: 1024 * 1024 * 100,
          spaceUsed: 0,
        },
      })
    ])
    .then(() => {
      return res.sendStatus(201)
    })
    .catch(() => {
      return res.sendStatus(404)
    })
  } catch (e) {
    return res.sendStatus(404);
  }
});

module.exports = router;
