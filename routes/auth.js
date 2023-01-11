require("dotenv").config();
const express = require('express');
let router = express.Router();
const expressSanitizer = require('express-sanitizer');
const jwt = require('jsonwebtoken');

router.use(express.json());
router.use(expressSanitizer());

router.post(`/login`, (req,res) => {
    const nameField = req.sanitize(req.body.name);
    const adminField = req.body.admin;
    const disableField = req.body.disable;

    const payload = {
        name: nameField,
        admin: adminField,
        disable: disableField
    };

    const accessToken = jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET);

    res.json({ accessToken:accessToken });
})

module.exports = router;
