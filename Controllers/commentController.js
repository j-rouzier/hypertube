const mongoose = require('mongoose');

const Comment = mongoose.model('Comment');

exports.writeCom = async (req, res) => {
	const com = new Comment({
		com: req.body.com,
		author: req.user._id,
		movie: req.body.movieId,
	});
	await com.save();
	if (com) {
		return res.send(true);
	}
	return res.send(false);
};