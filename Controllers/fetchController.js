const mongoose = require('mongoose');
const request = require('request');
const magnet = require('magnet-uri');
const OS = require('opensubtitles-api');
const http = require('https');
const imdb = require('imdb-api');
const slugify = require('slugify');
const srt2vtt = require('srt-to-vtt');
const fs = require('fs');

const Movie = mongoose.model('Movie');

const doRequest = url => new Promise((resolve, reject) => {
	request(url, (error, res, body) => {
		if (!error && res.statusCode === 200) {
			resolve(body);
		} else {
			reject(error);
		}
	});
});

const getArchiveURI = elem => magnet.encode({
	xt: `urn:btih:${elem.btih}`,
	dn: encodeURI(elem.title),
	tr: [
		'http://bt1.archive.org:6969/announce',
		'http://bt2.archive.org:6969/announce',
	],
	ws: 'https://archive.org/download/',
});

const getImdbId = (elem) => {
	let tag;
	if (elem.stripped_tags && Array.isArray(elem.stripped_tags)) {
		elem.stripped_tags.forEach((url) => {
			if (url.match('tt\\d{7}')) {
				tag = url.match('tt\\d{7}')[0];
			}
		});
	} else if (elem.stripped_tags && typeof elem.stripped_tags === 'string' && elem.stripped_tags.match('tt\\d{7}')) {
		tag = elem.stripped_tags.match('tt\\d{7}')[0];
	} else if (elem.description && elem.description.match('tt\\d{7}')) {
		tag = elem.description.match('tt\\d{7}')[0];
	}
	return tag;
};

const mergeResults = (movie, archive) => {
	const slug = slugify(movie.title + movie.year);
	Object.assign(archive, {
		title: movie.title,
		slug,
		year: movie.year,
		rating: parseFloat(movie.rating),
		length: parseFloat(movie.runtime),
		description: movie.plot,
		genres: movie.genres.split(', '),
		actors: movie.actors,
		image: movie.poster,
	});
};

// 1. Fetches movies from Archive.org
// 2. Movies which have an Imdb Id are kept
// 3. Requests OmDb Api for movies
// 4. Writes them to DB
exports.fetchArchive = async (req, res) => {
	let data = await doRequest('https://archive.org/advancedsearch.php?q=mediatype%3Amovies+collection%3AComedy_Films&fl%5B%5D=btih&fl%5B%5D=description&fl%5B%5D=format&fl%5B%5D=language&fl%5B%5D=stripped_tags&fl%5B%5D=title&sort%5B%5D=avg_rating+desc&sort%5B%5D=&sort%5B%5D=&rows=300&page=1&output=json&callback=callback&save=yes#raw');
	if (data) {
		const clean = [];
		const promises = [];
		data = JSON.parse(data.substr(9, data.length - 10));
		const movies = data.response.docs;
		movies.forEach((elem) => {
			const imdbId = getImdbId(elem);
			if (imdbId) {
				clean.push({ magnet: getArchiveURI(elem), hash: elem.btih, imdbId });
				promises.push(imdb.getById(imdbId, { apiKey: process.env.OMDB_KEY }));
			}
		});
		const imdbData = await Promise.all(promises);
		if (imdbData) {
			imdbData.forEach((movie, i) => { mergeResults(movie, clean[i]); });
			const bulk = Movie.collection.initializeUnorderedBulkOp();
			clean.forEach((movie) => {
				bulk.find({ slug: movie.slug }).upsert().updateOne({ $set: movie });
			});
			await bulk.execute();
			return res.send('archive updated');
		}
	}
	return res.send('Error');
};

const getYtsURI = (movie) => {
	const hash = (movie.torrents && movie.torrents[0] && movie.torrents[0].hash) || undefined;
	const mag = magnet.encode({
		xt: `urn:btih:${hash}`,
		dn: encodeURI(movie.title),
		tr: [
			'udp://open.demonii.com:1337/announce',
			'udp://tracker.openbittorrent.com:80',
			'udp://tracker.coppersurfer.tk:6969',
			'udp://glotorrents.pw:6969/announce',
			'udp://tracker.opentrackr.org:1337/announce',
			'udp://torrent.gresille.org:80/announce',
			'udp://p4p.arenabg.com:1337',
			'udp://tracker.leechers-paradise.org:6969',
		],
	});
	return hash !== undefined ? mag : null;
};

const dataFetcher = (url, pageNb) => {
	const promises = [];
	for (let page = 1; page <= pageNb; page += 1) {
		promises.push(doRequest(`${url}&page=${page}`));
	}
	return promises;
};

exports.fetchYts = async (req, res) => {
	const url = 'https://yts.ag/api/v2/list_movies.json?limit=50';
	const firstPage = await doRequest(`${url}&page=1`);
	const pageNb = Math.ceil(JSON.parse(firstPage).data.movie_count / 50);
	const result = await Promise.all(dataFetcher(url, pageNb)); // Resolves all promises
	const clean = [];
	result.forEach((page) => {
		JSON.parse(page).data.movies.forEach((movie) => {
			const hash = (movie.torrents && movie.torrents[0] && movie.torrents[0].hash) || undefined;
			clean.push({
				title: movie.title,
				hash,
				slug: movie.slug,
				imdbId: movie.imdb_code,
				year: movie.year,
				rating: movie.rating,
				length: movie.runtime,
				description: movie.synopsis,
				genres: movie.genres,
				image: movie.large_cover_image,
				magnet: getYtsURI(movie),
			});
		});
	});
	if (clean) {
		const bulk = Movie.collection.initializeUnorderedBulkOp();
		clean.forEach((movie) => {
			bulk.find({ slug: movie.slug }).upsert().updateOne({ $set: movie });
		});
		await bulk.execute();
		return res.send('yts updated');
	}
	return res.send('Error');
};

// exports.fetchSubs = async (movie) => {
// 	const OpenSubtitles = new OS({
// 		useragent: 'OSTestUserAgentTemp',
// 		ssl: true,
// 	});
// 	OpenSubtitles.search({
// 		sublanguageid: 'all',
// 		extensions: ['srt'],
// 		imdbid: movie.imdbId,
// 	}).then((subtitles) => {
// 		const file = fs.createWriteStream(`Public/downloads/${movie.slug}.vtt`);
// 		const tempFile = fs.createWriteStream(`Public/downloads/${movie.slug}.srt`);
// 		const r = http.get(subtitles.en.url, (response) => {
// 			response.pipe(tempFile);
// 			fs.createReadStream(`Public/downloads/${movie.slug}.srt`).pipe(srt2vtt()).pipe(file);
// 			fs.unlinkSync(`Public/downloads/${movie.slug}.srt`);
// 		});
// 	}).catch((err) => { console.log('api error lol'); });
// };

exports.fetchSubs = async (movie) => {
	const OpenSubtitles = new OS({
		useragent: 'OSTestUserAgentTemp',
		ssl: true,
	});
	const subtitles = await OpenSubtitles.search({
		sublanguageid: 'all',
		extensions: ['srt'],
		imdbid: movie.imdbId,
	});
	console.log(subtitles);
	if (subtitles) {
		for (const sub in subtitles) {
			if ({}.hasOwnProperty.call(subtitles, sub)) {
				if (sub === 'en' || sub === 'es' || sub === 'fr' || sub === 'ru') {
					const file = fs.createWriteStream(`Public/downloads/${movie.slug}_${sub}.vtt`);
					const tempFile = fs.createWriteStream(`Public/downloads/${movie.slug}_${sub}.srt`);
					tempFile.on('open', (fd) => {
						const r = http.get(subtitles[sub].url, (response) => {
							response.pipe(tempFile);
							fs.createReadStream(`${movie.slug}_${sub}.srt`).pipe(srt2vtt()).pipe(file);
							fs.unlinkSync(`Public/downloads/${movie.slug}_${sub}.srt`);
						});
					});
				}
			}
		}
	}
};


// exports.fetchSubs = async (req, res) => {
// 	const filmId = req.movie.imdbId;
// 	const OpenSubtitles = new OS({
// 		useragent: 'OSTestUserAgentTemp',
// 		ssl: true,
// 	});
// 	OpenSubtitles.search({
// 		sublanguageid: 'all',
// 		extensions: ['srt'],
// 		imdbid: filmId,
// 	}).then((subtitles) => {
// 		const file = fs.createWriteStream(`Public/downloads/${req.movie.slug}.vtt`);
// 		const tempFile = fs.createWriteStream(`Public/downloads/${req.movie.slug}.srt`);
// 		const r = http.get(subtitles.en.url, (response) => {
// 			response.pipe(tempFile);
// 			fs.createReadStream(`Public/downloads/${req.movie.slug}.srt`).pipe(srt2vtt()).pipe(file);
// 			fs.unlinkSync(`Public/downloads/${req.movie.slug}.srt`);
// 		});
// 	}).catch((err) => { console.log(err); });
// 	res.json(req.movie);
// };

// exports.fetchSubs = async (req, res) => {
// 	const OpenSubtitles = new OS({
// 		useragent: 'OSTestUserAgentTemp',
// 		ssl: true,
// 	});
// 	const subtitles = await OpenSubtitles.search({
// 		sublanguageid: 'all',
// 		extensions: ['srt'],
// 		imdbid: req.movie.imdbId,
// 	});
// 	if (subtitles) {
// 		for (const sub in subtitles) {
// 			if ({}.hasOwnProperty.call(subtitles, sub)) {
// 				if (sub === 'en' || sub === 'es' || sub === 'fr' || sub === 'ru') {
// 					// fs.unlinkSync(`Public/downloads/${req.movie.imdbId}_${sub}.vtt`);
// 					// const file = fs.createWriteStream(`Public/downloads/${req.movie.slug}_${sub}.vtt`);
// 					const tempFile = fs.createWriteStream(`Public/downloads/${req.movie.slug}_${sub}.srt`);
// 					tempFile.on('open', (fd) => {
// 						const r = http.get(subtitles[sub].url, (response) => {
// 							response.pipe(tempFile);
// 							// fs.createReadStream(`${req.movie.slug}_${sub}.srt`).pipe(srt2vtt()).pipe(file);
// 							// fs.unlinkSync(`Public/downloads/${req.movie.slug}_${sub}.srt`);
// 						});
// 					});
// 				}
// 			}
// 		}
// 	}
// 	res.json(req.movie);
// };
