'use strict';

require('dotenv').config();

const _ = require('underscore');
const async = require('async');
const request = require('superagent');
const Promise = require('bluebird');
const utils = require('./utils');
const jsonfile = require('jsonfile')

class Spotify {

    /**
     * Request authorization to access data
     */
    authorize() {
        let self = this;
        return new Promise((resolve, reject) => {
            const basicAuth = new Buffer(`${process.env.SPOTIFY_CLIENT}:${process.env.SPOTIFY_SECRET}`).toString('base64');
            request.post('https://accounts.spotify.com/api/token')
                .set({Authorization: `Basic ${basicAuth}`})
                .send('grant_type=client_credentials')
                .end((err, res) => {
                    if (err) return reject(err);
                    self.accessToken = res.body.access_token;
                    return resolve(res.body);
                });
        })
    }


    listPlaylists(userId) {
        let self = this;
        console.log(self)
        return new Promise((resolve, reject) => {
            request.get(`https://api.spotify.com/v1/users/${userId}/playlists`)
                .set({Authorization: `Bearer ${self.accessToken}`})
                .end((err, res) => {
                    if (err) return reject(err);
                    return resolve(res.body);
                });
        })
    }


    listPlaylistTracks(userId, playlistId) {
        let self = this;
        return new Promise((resolve, reject) => {
            request.get(`https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`)
                .set({Authorization: `Bearer ${self.accessToken}`})
                .end((err, res) => {
                    if (err) return reject(err);
                    //  include audio-features for every track
                    const items = res.body.items;
                    let trackIds = items.map((item) => item.track.id);
                    this.getAudioFeatures(trackIds)
                        .then((res) => {
                            // merge tracks and audio-features together
                            let audioFeatures = _.indexBy(res, 'id');
                            let tracks = items.map((item) => {
                                let track = item.track;
                                return {
                                    id: track.id,
                                    name: track.name,
                                    popularity: track.popularity,
                                    href: track.href,
                                    audio_features: audioFeatures[track.id]
                                };
                            })
                            resolve(tracks)
                        }).catch(reject)
                });
        })
    }

    listPlaylistArtists(userId, playlistId) {
        let self = this;
        return new Promise((resolve, reject) => {
            request.get(`https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`)
                .set({Authorization: `Bearer ${self.accessToken}`})
                .end((err, res) => {
                    if (err) return reject(err);
                    let artists = [];
                    res.body.items.forEach((item) => {
                        item.track.artists.forEach((artist) => {
                            artists.push(artist.id)
                        })
                    })
                    artists = _.uniq(artists);
                    return resolve(artists);
                });
        })
    }

    getPlaylistGenres(userId, playlistId) {
        return new Promise((resolve, reject) => {

            this.listPlaylistArtists(userId, playlistId)
                .then((artists) => {
                    let genres = [];
                    let artistSets = utils.breakDownBy(artists, 50);

                    async.each(artistSets, (artists, next) => {
                        let self = this;
                        let artistIds = artists.join(',');
                        let query = `ids=${artistIds}`;
                        request.get(`https://api.spotify.com/v1/artists?${query}`)
                            .set({Authorization: `Bearer ${self.accessToken}`})
                            .end((err, res) => {
                                if (err) next(err)
                                res.body.artists.forEach((item) => {
                                    item.genres.forEach((g) => {
                                        genres.push(g);
                                    })
                                })
                                next(null);
                            });
                    }, (err) => {
                        if (err) return reject(err);
                        genres = _.uniq(genres)
                        resolve(genres);
                    })
                }).catch(reject);
        })
    }

    getAudioFeatures(trackIds) {
        return new Promise((resolve, reject) => {
            let features = [];
            let trackSets = utils.breakDownBy(trackIds, 100);
            async.each(trackSets, (tracks, next) => {
                let self = this;
                let query = `ids=${tracks.join(',')}`;
                request.get(`https://api.spotify.com/v1/audio-features?${query}`)
                    .set({Authorization: `Bearer ${self.accessToken}`})
                    .end((err, res) => {
                        if (err) next(err)
                        features.push(res.body.audio_features);
                        next(null);
                    });
            }, (err) => {
                if (err) return reject(err);

                // group together those stacks of results
                features = _.flatten(features);
                resolve(features);
            })
        })
    }

    getArchiveStats(userId) {
        return new Promise((resolve, reject) => {
            async.waterfall([
                (next) => {
                    /* get users playlists */
                    this.listPlaylists(userId)
                        .then((res) => {
                            let playlists = [];
                            res.items.forEach((p) => {
                                const name = p.name;
                                if (name.indexOf('.2016') > -1) {
                                    const images = p.images;
                                    const id = p.id;
                                    playlists.push({name, id, images});
                                }
                            })
                            next(null, playlists);
                        }).catch(next);
                },
                (playlists, next) => {
                    let list = [];
                    async.each(playlists, (p, cb) => {
                        /* Get playlist genres */
                        this.getPlaylistGenres(userId, p.id)
                            .then((genres) => {
                                p.genres = genres;
                                list.push(p)
                                cb(null)
                            }).catch(cb)
                    }, (err) => {
                        if (err) return next(err);
                        next(null, list)
                    })
                },
                (playlists, next) => {
                    let list = [];
                    async.each(playlists, (p, cb) => {
                        /* Get playlist genres */
                        this.listPlaylistTracks(userId, p.id)
                            .then((genres) => {
                                p.tracks = genres;
                                list.push(p)
                                cb(null)
                            }).catch(cb)
                    }, (err) => {
                        if (err) return next(err);
                        next(null, list)
                    })
                }
            ], (err, playlists) => {
                if (err) reject(err);
                jsonfile.writeFile('./tmp/data.json', playlists, {spaces: 2}, function (err) {
                    if (err) reject(err)
                })
            })
        })
    }
}

module.exports = Spotify;
