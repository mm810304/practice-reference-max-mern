const fs = require('fs');

const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Place = require('../models/Place');

const HttpError = require('../models/HttpError');
const getCoordsForAddress = require('../utils/location');
const User = require('../models/User');
const mongooseUniqueValidator = require('mongoose-unique-validator');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError('There was an error getting place by id', 500);

    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find a place for the provided id', 404);

    return next(error);
  }

  res.json({
    place: place.toObject( { getters: true })
  });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({
      creator: userId
    });
  } catch (err) {
    const error = new HttpError('Could not find place by user Id', 500);
    return next(error);
  }
  

  if (!places || places.length === 0) {
    const error = new HttpError('Could not find a place for the provided user id', 404);
    
    return next(error);
  }

  res.json({
    places: places.map(place => place.toObject({ getters: true }))
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError('Invalid inputs passed, please check your data', 422));
  }

  const { title, description, address } = req.body;

  let coordinates;

  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }
  

  const createdPlace = new Place({
    title: title,
    description: description,
    address: address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId
  });

  let user;

  try {
    user = await User.findById(req.userData.userId);
    console.log(user);
  } catch (err) {
    const error = new HttpError('Creating placed failed.', 500);

    console.log(err)

    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);

    return next(error);
  }

  console.log(user);

  try {
    const curSession = await mongoose.startSession();
    curSession.startTransaction();

    await createdPlace.save({ session: curSession });

    user.places.push(createdPlace);

    await user.save({ session: curSession });

    await curSession.commitTransaction();
  } catch (err) {
    const error = new HttpError('Creating place failed', 500);
    return next(error);
  }

  res.status(201).json({
    place: createdPlace
  });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError('Invalid inputs passed, please check your data', 422);
    return next(error);
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError('Could not update place with given id', 500);
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this place.', 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError('Could not save updated place to DB', 500);

    return next(error);
  }

  res.status(200).json({
    place: place.toObject({ getters: true })
  });
};

const deletePlace =async (req, res, next) => {
  const placeId = req.params.pid;
  
  let place;

  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    const error = new HttpError('Could not delete place with given Id', 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError('Could not find a place for this id', 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError('You are not allowed to delete this place.', 401);
    return next(error);
  }

  const imagePath = place.image;

  try {
    const curSession = await mongoose.startSession();
    curSession.startTransaction();

    await place.remove({ session: curSession });

    place.creator.places.pull(place);
    
    await place.creator.save({ session: curSession });

    await curSession.commitTransaction();
  } catch (err) {
    const error = new HttpError('Could not remove place from DB', 500);

    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err)
  });

  res.status(200).json({
    message: 'Deleted Place.'
  });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;