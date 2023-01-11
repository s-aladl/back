const express = require('express');
let router = express.Router();
const Fuse = require('fuse.js');
const expressSanitizer = require('express-sanitizer');
const lists = require('../db/lists.json');
const tracks = require('../db/raw_tracks.json');
const cors = require('cors');

router.use(cors());
router.use(express.json());
router.use(expressSanitizer());

//3.b. search by artist, genre, or track title
router.get('/search/', (req,res) => {
    const artistSearch = req.sanitize(req.query.artist) || null;
    const genreSearch = req.sanitize(req.query.genre) || null;
    const titleSearch = req.sanitize(req.query.title) || null;
    let output = [];

    if(titleSearch){
        output = searchTracks(titleSearch,"track_title", tracks);
        if(genreSearch){
            output = searchTracks(genreSearch,"track_genres", output);
        }
        if(artistSearch){
            output = searchTracks(artistSearch,"artist_name",output);
        }
    } else if(genreSearch){
        output = searchTracks(genreSearch,"track_genres", tracks);
        if(artistSearch){
            output = searchTracks(artistSearch,"artist_name",output);
        }
    } else if(artistSearch){
        output = searchTracks(artistSearch,"artist_name", tracks);
    } else {
        res.status(400).send(`Invalid search.`);
    }

    res.send(output);
})

//3.f. list public playlists
router.get('/public-playlists', (req,res) => {
    const publicPlaylists = getPublicPlaylists();

    const sortedPublicPlaylists = publicPlaylists.sort((a,b) => {
        var c = new Date(a.lastModified);
        var d = new Date(b.lastModified);
        return d-c;
    });

    res.send(sortedPublicPlaylists);
})

//get specific public playlist, used for race conditions
router.get(`/public-playlists/:playlistName/:creatorName`, (req,res) =>{
   
    const pName = req.sanitize(req.params.playlistName);
    const cName = req.sanitize(req.params.creatorName);
    const publicPlaylists = getPublicPlaylists();

    for(let i=0;i<publicPlaylists.length;i++){
        if(publicPlaylists[i].creator == cName && publicPlaylists[i].name == pName) res.send(publicPlaylists[i]);
    }
    
    res.status(400).send('Playlist not found.')
})

//get track by ID
router.get(`/track/:trackID`, (req,res) =>{
    const trackID = req.sanitize(req.params.trackID);

    tracks.forEach(track =>{
        if(track.track_id == trackID){
            res.send(track);
        }
    })

    res.status(400).send(`Track with ID ${trackID} not found.`)
})

//3.g-h. get detailed track info

//helper functions
function searchTracks(searchTerm,key,data){
    const fuse = new Fuse(data, {
        //adjust if needed
        isCaseSensitive: false,
        threshold: 0.3,
        ignoreLocation: true,
        keys: [key]
    });
    const wrapped = fuse.search(searchTerm);
    let unwrapped = [];
    wrapped.forEach(e => {
        unwrapped.push(e.item);
    });
    return unwrapped;
}

function getPublicPlaylists(){
    let output = [];

    for(var i=0;i<lists.length;i++){
        if(output.length >= 10) return output; //return if there are 10

        let currentList = lists[i];
        if(currentList.visibility == 'public') output.push(currentList);
    }

    return output; //returns when less than 10
}

module.exports = router;
