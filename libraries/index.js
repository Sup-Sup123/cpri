'use strict'

const express = require('express')
const sequelize = require('sequelize')
const ejs = require('ejs')
const bodyparser = require('body-parser')
const request = require('request-promise')
const md5 = require('md5')
const bcrypt = require('bcrypt')
const session = require('express-session')
const helmet = require('helmet')
const nodemailer = require('nodemailer')
const canvas = require('canvas')
const webhook = require('discord-webhook-node')
const libraries = {
    express: express,
    sequelize: sequelize,
    ejs: ejs,
    bodyparser: bodyparser,
    request: request,
    md5: md5,
    bcrypt: bcrypt,
    session: session,
    helmet: helmet,
    nodemailer: nodemailer,
    canvas: canvas,
    webhook: webhook
}

module.exports = libraries
