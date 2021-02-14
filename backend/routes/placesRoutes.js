const express = require('express');
const { check } = require('express-validator');

const placesControllers = require('../controllers/placesControllers');
const fileUpload = require('../middleware/fileUpload');
const checkAuth = require('../middleware/checkAuth');

const router = express.Router();

router.get('/:pid', placesControllers.getPlaceById);

router.get('/user/:uid', placesControllers.getPlacesByUserId);

router.use(checkAuth);

router.post('/', 
  fileUpload.single('image'),
  [
    check('title')
      .not().isEmpty(),
    check('description')
      .isLength({ min: 5 }),
    check('address')
      .not().isEmpty()
  ], 
  placesControllers.createPlace);

router.patch('/:pid', [
  check('title')
    .not().isEmpty(),
  check()
    .isLength({ min: 5 })
], placesControllers.updatePlace);

router.delete('/:pid', placesControllers.deletePlace);

module.exports = router;