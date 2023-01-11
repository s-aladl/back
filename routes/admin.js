require("dotenv").config();
const express = require('express');
const router = express.Router();
const expressSanitizer = require('express-sanitizer');
const lists = require('../db/lists.json');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const moment = require('moment');

router.use(authenticateToken);
router.use(express.json());
router.use(expressSanitizer());

function authenticateToken(req,res,next) {
    const token = req.headers.authorization;
    if(token == null) return res.sendStatus(401);

    try {
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // If the token is valid, attach the payload to the request object
        req.user = payload;

        if(!payload.admin) res.status(401).send('Not an admin account');

        // Call the next middleware or route handler
        next();
  } catch (error) {
    // If the token is invalid, send an error response to the client
    return res.status(401).send(error);
  }
}

//5.c. mark review as hidden
router.post(`/:adminName/:playlistName/:creatorName/reviews/:reviewerName/change-hidden`, (req,res) => {
    if(!isSameUser(req)) res.status(401).send('Not the same user.');

    const hiddenStatus = req.body.hidden; //sanitize later
    const pName = req.sanitize(req.params.playlistName);
    const cName = req.sanitize(req.params.creatorName);
    const rName = req.sanitize(req.params.reviewerName);
    const rTime = req.sanitize(req.body.dateTime);

    const creatorPlaylists = getUserPlaylists(cName);
    const reviewPlaylist = creatorPlaylists.filter(
        (playlist) => {
            return playlist.name == pName;
        }
    )[0];
    const review = getReview(reviewPlaylist.reviews,rName,rTime);

    if(typeof hiddenStatus != 'boolean'){
        res.status(400).send(`Must receive boolean value.`)
    } else if(!playlistNameExists(creatorPlaylists,pName)){
        res.status(400).send(`Playlist not found.`)
    } else if (!review){
        res.status(400).send(`Review not found`)
    } else {
        let data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../db/lists.json')));
        let changedReview;
        data.forEach(list => {
            if(list.name == pName && list.creator == cName){
                list.reviews.forEach(review => {
                    if(review.username == rName && review.dateTime == rTime){
                        review.hidden = Boolean(hiddenStatus);
                        changedReview = review;
                        list.averageRating = calculateAverageRating(list.reviews);
                    } 
                });
            }
        });
        fs.writeFileSync(path.resolve(__dirname, '../db/lists.json'), JSON.stringify(data));
        res.send(changedReview);
    }
})

router.put(`/:adminName/log/:logType`, (req,res) => {
    if(!isSameUser(req)) res.status(401).send('Not the same user.');

    const pName = req.sanitize(req.body.playlistName);
    const cName = req.sanitize(req.body.creatorName);
    const rName = req.sanitize(req.body.reviewerName);
    const rTime = req.sanitize(req.body.reviewDateTime);
    const logDate = req.sanitize(req.body.date)
    const logType = req.sanitize(req.params.logType);

    const log = req.body;
    log.type = logType;

    const validLogTypes = ['Request', 'Notice', 'Dispute'];
    const creatorPlaylists = getUserPlaylists(cName);

    let data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../db/dmca_logs.json')));    

    if(!validLogTypes.includes(logType)){
        res.status(400).send('Invalid log type')
    } else if(!moment(logDate).isValid() || !moment(rTime).isValid()){
        res.status(400).send('Invalid date')
    } else if(!playlistNameExists(creatorPlaylists,pName)){
        res.status(400).send('Playlist not found')
    } else {
        lists.forEach(list => {
            if(list.creator == cName && list.name == pName){
                review = getReview(list.reviews,rName,rTime)
                if(!getReview){
                    res.status(400).send('Review not found')
                } else {
                    data.push(log)
                    fs.writeFileSync(path.resolve(__dirname, '../db/dmca_logs.json'), JSON.stringify(data));
                    res.send(log);
                }
            }
        })
    }    
})

//helper functions
function getUserPlaylists(username){
    let output = [];
    lists.forEach(list => {
        if(username == list.creator) output.push(list);
    });
    return output;
}

function isSameUser(req){
    return req.user.name == req.params.adminName;
}

function playlistNameExists(playlists, name){
    for(let i=0;i<playlists.length;i++){
        if(playlists[i].name == name) return true;
    }
    return false;
}

function getReview(reviews,rName,rTime){
    return reviews.filter(
        (review) => {
            return review.username == rName && review.dateTime == rTime;
        }
    )[0];
}

function calculateAverageRating(reviews){
    let total = 0, count = 0;
    reviews.forEach(review => {
        if(!review.hidden){
            total += review.rating;
            count++;
        } 
    });
    return (total/count).toFixed(1);
}

module.exports = router;
