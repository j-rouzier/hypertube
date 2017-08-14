const mongoose = require('mongoose');

const passportLocalMongoose = require('passport-local-mongoose');

const movieSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	slug: {
		type: String,
		required: true,
		unique: true,
	},
	hash: {
		type: String,
	},
	imdbId: {
		type: String,
	},
	year: {
		type: Number,
		required: true,
	},
	rating: {
		type: Number,
		required: true,
	},
	length: {
		type: Number,
	},
	description: {
		type: String,
		required: true,
	},
	genres: [{
		type: String,
	}],
	image: {
		type: String,
		required: true,
	},
	actors: {
		type: String,
	},
	magnet: {
		type: String,
	},
	path: {
		type: String,
	},
});

movieSchema.statics.findAndModify = function fAndM(query, callback) {
	return this.collection.findAndModify(query, callback);
};

module.exports = mongoose.model('Movie', movieSchema);
