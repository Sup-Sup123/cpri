'use strict'

const path = require('path')
const cpri = path.join(__dirname, '..')

const config = {

    debugger: true,
    file_log: true,

    web: {
        port: 5555,
        site_key: '',
        secret_key: '',
        session_secret: '',
        domain: 'cp-oasis.tk',
    },

    utils: {
        database: {
            on: true,
            host: '127.0.0.1',
            username: '',
            password: '',
            name: '',
            port: 3306,
            dialect: 'mysql',
        },
    
        nodemailer: {
            on: true,
            host: 'obviousmailserversubdomain.cp-oasis.tk',
            username: '',
            password: '',
            port: 25,
            secure: false,
        },

        webhooks: {
            on: true,
            panel_url: 'https://discordapp.com/api/webhooks/',
            register_url: 'https://discordapp.com/api/webhooks/',
            ban_url: 'https://discordapp.com/api/webhooks/',
            unban_url: 'https://discordapp.com/api/webhooks/',
            verify_url: 'https://discordapp.com/api/webhooks/6',
            ipban_url: 'https://discordapp.com/api/webhooks/656196815837',
            item_url: 'https://discordapp.com/api/webhooks/656985999255273473/v0D48ON3o4V'
        }
    },

    crypto: {
        salt: ``,
    },

    /* 0 = off */
    /* 1 = users, mods & admin */
    /* 2 = mod & admin only */
    /* 3 = admin only */

    admins: [104, 125, 60053547, 60053508, 141, 60053545, 60053486, 60053519, 60054737],
    owners: ['ZWrld', 'Sup Sup123', 'Z', 'S'],

    features: {
        reset_password: 1,
        add_items: 2,
        redemption: 1,
        change_email: 1,
        change_password: 1,
        verify_user: 2,
        ban: 2,
        unban: 2,
        manage_penguins: 3,
        logs: 2,
    },
    
    tables: {
        penguin: `${cpri}/tables/penguin.js`, 
        stats: `${cpri}/tables/server.js`,
        inventory: `${cpri}/tables/inventory.js`,
        activation: `${cpri}/tables/activation.js`,
        redemption_code:  `${cpri}/tables/redemption_code.js`,
        redemption_award: `${cpri}/tables/redemption_award.js`,
        penguin_redemption: `${cpri}/tables/penguin_redemption.js`,
        ban: `${cpri}/tables/ban.js`, 
        reset: `${cpri}/tables/reset.js`,
        furniture: `${cpri}/tables/furniture.js`,
    },
}

module.exports = config
