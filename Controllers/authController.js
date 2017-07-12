const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');


exports.loginLocal = passport.authenticate('local', { failureRedirect: '/', successRedirect: '/' });
exports.loginNoRedirect = (req, res, next) => {
  passport.authenticate('local', function(err, user, info) {
    req.logIn(user, function(err) {});
		return res.send(user);
  })(req, res, next);
};

exports.loginGoogle = passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.profile.emails.read'] });
exports.loginGoogleCb = passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' });

exports.login42 = passport.authenticate('42');
exports.login42Cb = passport.authenticate('42', { failureRedirect: '/', successRedirect: '/' });

exports.hasAccount = async (req, res) => {
	const user = await User.findOne(req.query);
	res.send((user && user.auth.type) || false);
};

exports.logout = (req, res) => {
	req.logout();
	res.redirect('/');
};
