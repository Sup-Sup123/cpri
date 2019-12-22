'use strict'

const events = require('events')
const terminal_log = new events.EventEmitter()
const args_events = new events.EventEmitter()
const true_aliases = ['t', 'true']

/* COMMAND LINE ARGUMENTS */

args_events.on('p', (value, config) => {
    config.web.port = Number(value)
})

args_events.on('db', (value, config) => {
    if(true_aliases.includes(value)){
        config.utils.database.on = true
    }
    else{
        config.utils.database.on = false
    }
})

args_events.on('nodemailer', (value, config) => {
    if(true_aliases.includes(value)){
        config.utils.nodemailer.on = true
    }
    else{
        config.utils.nodemailer.on = false
    }
})

args_events.on('debugger', (value, config) => {
    if(true_aliases.includes(value)){
        config.utils.nodemailer.on = true
    }
    else{
        config.utils.nodemailer.on = false
    }
})

args_events.on('f', (value, config) => {
    if(true_aliases.includes(value)){
        config.file_log = true
    }
    else{
        config.file_log = false
    }
})


/* LOGGER MESSAGES */

terminal_log.on('args_length', (message) => {
    message.content += 'You provided the wrong amount of arguments, please run node app -help'
})

terminal_log.on('database', (message) => {
    message.content += 'The database connection has failed, please check your details'
})

terminal_log.on('error', (message) => {
    message.content += 'The application has discovered an error, please turn on debug mode to solve this.'
})

terminal_log.on('avatar', (message) =>{
    message.content += 'The application has discovered an error whilst forming an image for the avatar API, please turn on debugger mode!.'
})

module.exports = {args_events, terminal_log}