'use strict'

const dyn = require('../dynamite')
const ejs_events = require('./ejs')
const path = require('path')
const fs = require('fs')
const file = path.basename(__filename)
const paper_items = require('../sauce/crumbs/paper_items.json')
const furniture_items = require('../sauce/crumbs/furniture_items.json')

let config = require('./config')

const dynamite = new dyn(process.argv, config)
dynamite.handle_arguments()
dynamite.setup_utils()
dynamite.logger.success('successfully parsed arguments & setup utils')
dynamite.logger.success('application powered by rsakeys.org')

const express = dynamite.libraries.express
const ejs = dynamite.libraries.ejs
const bodyparser = dynamite.libraries.bodyparser
const session = dynamite.libraries.session
const helmet = dynamite.libraries.helmet
const app = express()

let login_ips = {} /* logged to prevent spam */
let players = {}

config = dynamite.config
const web = dynamite.config.web

initialize_express()

app.get('/', (request, response) =>{
    response.render('home.html', {})
})

app.get('/media/xml/start-module-xml', (request, response) =>{
    response.sendStatus(404)
})

app.get('/stats', async (request, response) =>{
    try{
        const retrieved_stats = await dynamite.stats.findOne({where: {ID: 340}})
        response.send(`${retrieved_stats.Count}`)
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/api/reset/stats', async (request, response) =>{
    // handle IP check
    try{
        await dynamite.stats.update({Count: 0}, {where: {ID: 340}})
        response.send('Updated stats to 0') //change to json
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/api/ip_spam/delete/(:ip)', (request, response) =>{
    // handle IP check
    const ip = request.params.ip
    if(!login_ips[ip]){
        response.send(`This IP ${ip} was not found in the IP spam records.`) //change to json
    }
    else{
        delete login_ips[ip]
        response.send(`successfully removed ip ${ip}`) //change to json
    }
})

app.get('/api/login_sessions/delete/(:username)', (request, response) =>{
    // handle IP check
    const username = request.params.username
    if(!players[username]){
        response.send(`The username ${username} was not found in the current login sessions`) //change to json
    }

    else{
        delete players[username] 
        response.send(`successfully deleted username ${username}`) //change to json
    }
})

app.get('/api/ip_spam/clear', (request, response) =>{
    // handle IP check
    for(let ip in login_ips){
        delete login_ips[ip]
    }
    response.send(`successfully reset ip spam collection`) // change to json
})

app.get('/api/ip_spam', (request, response) =>{
    // handle IP check
    response.send(login_ips) //change to json
})

app.get('/avatar/(:id)', async (request, response) => {
    if(!request.params.id){
        response.send('You need to specify a penguin ID.')
    }
    else{
        try{
            const user = await dynamite.penguin.findOne({where: {ID: request.params.id}})
            if(!user){
                response.send('This penguin ID was not found.')
            }
            else{
                const img = await build_avatar(user)
                response.set('Content-Type', 'image/png')
                response.set('Content-Length', img.length)
                response.end(img)
            }
        }
        catch(e){
            dynamite.logger.warn(e)
            dynamite.error(file)
            response.redirect(`https://${web.domain}`)
        }
    }
})

app.get('/coins/(:id)', async (request, response) => {
    if(!request.params.id){
        response.send('You need to specify a penguin ID.')
    }
    else{
        try{
            const user = await dynamite.penguin.findOne({where: {ID: request.params.id}})
            if(!user){
                response.send('This penguin ID was not found.')
            }
            else{
                response.send(`${user.Coins}`)
            }
        }
        catch(e){
            dynamite.logger.warn(e)
            dynamite.error(file)
            response.redirect(`https://${web.domain}`)
        }
    }
})


app.get('/activate/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const activation_key = request.params.id
        const user = await dynamite.activation.findOne({where: {ActivationKey: activation_key}})
        if(!user){
            ejs_events.emit('activation_key_not_found', ejs_data, web, activation_key)
            response.render('create.html', ejs_data)
        }
        else{
            const player = await dynamite.penguin.findOne({where: {ID: user.PenguinID}})

            await dynamite.penguin.update({Active: 1}, {where: {ID: user.PenguinID}})
            await dynamite.activation.destroy({where: {ActivationKey: user.ActivationKey}})
            const username = player.Username
            const new_player = initiate_player(player)
            request.session.username = username
            request.session.loggedin = true
            players[username] = new_player
            dynamite.logger.success(`PenguinID:${user.PenguinID} has successfully activated their account.`)
            const activation_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Registration Activity**')
            .addField('**Username**', `**${username}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A user has just activated their account, this user is now logged into Club Penguin Reimagined's web panel!**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.register_hook.send(activation_embed);
            
            response.redirect('/login')
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/create', async (request, response) => {
    try{
        const username_given = request.body.username
        const email_given = request.body.email
        const password_given = request.body.password
        const color_given = request.body.penguin_color
        const client_ip = dynamite.get_ip(request)
        const recaptcha_response = request.body.recaptcha_response
        const recaptcha_url = form_recaptcha_url(recaptcha_response, client_ip)
        let ejs_data = {}

        dynamite.logger.warn(`${username_given}:${client_ip}  is trying to register to CPRI.`)

        if(!await recaptcha_test(recaptcha_url)){ 
            ejs_events.emit('register_captcha', ejs_data, web)
            response.render('create.html', ejs_data)
        }

        else if(await username_taken(username_given)){
            ejs_events.emit('username_taken', ejs_data, web, username_given)
            response.render('create.html', ejs_data)
        }
    
        else if(await email_taken(email_given)){
            ejs_events.emit('email_taken', ejs_data, web, email_given)
            response.render('create.html', ejs_data)
        }

        else if (await ip_check(client_ip)){
            ejs_events.emit('registration_ip_spam', ejs_data, web, client_ip)
            response.render('create.html', ejs_data)
        }

        else{
            const username = username_given
            const email = email_given
            const password = await generate_bcrypt_password(password_given)
            const color = color_given.replace('/img/colors/', '')

            await dynamite.penguin.create({ID: null, 
                Username: username, 
                Nickname: username, 
                Approval: 0, 
                Password: password, 
                Email: email, 
                Active: 0, 
                Color: color, 
                IP: client_ip
            })

            const player = await dynamite.penguin.findOne({where: {Email: email}})
            await dynamite.inventory.create({PenguinID: player.ID, ItemID: color})
            await send_activation_mail(player)
            dynamite.logger.success(`${username}:${client_ip} has just registered to CPRI.`)
            const register_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Registration Activity**')
            .addField('**Username**', `**${username}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A user has just registered an account for Club Penguin Reimagined, they must activate their penguin!**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.register_hook.send(register_embed);
            ejs_events.emit('successful_registration', ejs_data, web, username)
            response.render('create.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/login', async (request, response) => {
    try{
        const given_username = request.body.username
        const given_password = request.body.password
        const client_ip = dynamite.get_ip(request)
        const recaptcha_response = request.body.recaptcha_response
        const recaptcha_url = form_recaptcha_url(recaptcha_response, client_ip)
        const user = await dynamite.penguin.findOne({where: {Username: `${given_username}`}})
        let ejs_data = {}

        dynamite.logger.warn(`${given_username}:${client_ip}  is trying to login to CPRI's panel.`)

        if(!await recaptcha_test(recaptcha_url)){ 
            ejs_events.emit('login_captcha', ejs_data, config)
            response.render('panel.html', ejs_data)
        }

        else if(ip_spam(client_ip)){
            const ip_spam = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('Login Activity')
            .setURL(`https://${web.domain}/api/ip_spam/delete/${client_ip}`)
            .addField('**IP**', `**${client_ip}**`, true)
            .addField('**Unban Link**', `**https://${web.domain}/api/ip_spam/delete/${client_ip}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A users IP has been blacklisted from Club Penguin Reimagined for multiple login attempts & failures to the web panel!**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.ipban_hook.send(ip_spam);
            ejs_events.emit('login_ip_spam', ejs_data, config)
            response.render('panel.html', ejs_data)
        }

        else if(!user){
            ejs_events.emit('user_404', ejs_data, config, given_username)
            response.render('panel.html', ejs_data)
        }

        else if(!user.Active){
            ejs_events.emit('not_activated', ejs_data, config)
            response.render('panel.html', ejs_data)
        }
    
        else if(!await check_password(given_password, user.Password)){
            ejs_events.emit('incorrect_password', ejs_data, config)
            response.render('panel.html', ejs_data)
        }

        else{
            delete login_ips[client_ip]
            request.session.loggedin = true
            request.session.username = given_username
            const new_player = initiate_player(user)
            players[given_username] = new_player
            response.redirect('/panel')
            const login_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Login Activity**')
            .addField('**Username**', `**${given_username}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A user has just logged into Club Penguin Reimagined's panel!**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.panel_hook.send(login_embed);
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/reset/password/(:id)', async (request, response) => {
    try{
        let ejs_data = {}
        const given_password = request.body.password
        const given_id = request.params.id
        const reset_user = await dynamite.reset.findOne({where: {ResetID: given_id}})
        if(!reset_user){
            ejs_events.emit('reset_404', ejs_data, web, id)
            response.render('reset.html', ejs_data)
        }

        else if(reset_user.Expires < new Date().getTime()){
            ejs_events.emit('reset_expiry', ejs_data, web)
            response.render('reset.html', ejs_data)
        }

        else{
            const user = await dynamite.penguin.findOne({where: {ID: reset_user.PenguinID}})
            const new_password = await generate_bcrypt_password(given_password)
            await dynamite.penguin.update({Password: new_password}, {where: {ID: user.ID}})
            await dynamite.reset.destroy({where: {ResetID: given_id}})
            ejs_events.emit('password_update_success', ejs_data, web, user)
            response.render('reset.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/reset', async (request, response) => {
    try{
        const given_username = request.body.username
        const given_email = request.body.email
        const client_ip = dynamite.get_ip(request)
        const recaptcha_response = request.body.recaptcha_response
        const recaptcha_url = form_recaptcha_url(recaptcha_response, client_ip)
        const user = await dynamite.penguin.findOne({where: {Username: `${given_username}`}})
        let ejs_data = {}

        if(!await recaptcha_test(recaptcha_url)){ 
            ejs_events.emit('reset_captcha', ejs_data, web)
            response.render('reset.html', ejs_data)
        }

        else if(!user){
            ejs_events.emit('reset_user_404', ejs_data, web, given_username)
            response.render('reset.html', ejs_data)
        }

        else if(!await email_taken(given_email)){
            ejs_events.emit('email_not_found', ejs_data, web, given_email)
            response.render('reset.html', ejs_data)
        }

        else if(given_email !== user.Email){
            ejs_events.emit('email_not_found', ejs_data, web, given_email)
            response.render('reset.html', ejs_data)
        }

        else{
            await send_reset_email(given_email, user)
            ejs_events.emit('reset_sent', ejs_data, web, given_email)
            response.render('reset.html', ejs_data)

        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            ejs_events.emit('panel', ejs_data, config, player)
            response.render('panel.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/add_clothing', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.moderator){
                ejs_events.emit('add_clothing', ejs_data, web, player, paper_items)
                response.render('features.html', ejs_data)
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.get('/panel/add_furniture', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.moderator){
                ejs_events.emit('add_furniture', ejs_data, web, player, furniture_items)
                response.render('features.html', ejs_data)
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.get('/redeem', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            ejs_events.emit('redemption', ejs_data, web, player)
            response.render('features.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/email', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            ejs_events.emit('email', ejs_data, web)
            response.render('features.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/logs', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.moderator){
                ejs_events.emit('logs', ejs_data, config, player)
                response.render('features.html', ejs_data) 
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/password', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            ejs_events.emit('password', ejs_data, web)
            response.render('features.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/unban', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.moderator){
                await player.get_banned_data()
                ejs_events.emit('unban', ejs_data, web, player)
                response.render('features.html', ejs_data) 
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/ban', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.moderator){
                ejs_events.emit('ban', ejs_data, web, player)
                response.render('features.html', ejs_data) 
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const penguins = await player.get_penguins()
                ejs_events.emit('penguins_table', ejs_data, web, player, penguins)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                const penguin = new Player(user_details)
                ejs_events.emit('edit_penguin', ejs_data, web, player, penguin)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)/username', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_username', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)/email', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_email', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)/nickname', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_nickname', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)/coins', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_coins', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/reset/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        const reset_user = await dynamite.reset.findOne({where: {ResetID: `${given_id}`}});
        if(!reset_user){
            ejs_events.emit('reset_404', ejs_data, web, given_id)
            response.render('reset.html', ejs_data) 
        }
        else{
            ejs_events.emit('set_password', ejs_data, web, given_id)
            response.render('reset.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)/password', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_password', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.get('/panel/admin/(:id)/rank', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_rank', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/admin/(:id)/namecolor', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.administrator){
                const user_details = await player.get_user(given_id)
                ejs_events.emit('edit_name_color', ejs_data, web, player, user_details)
                response.render('features.html', ejs_data)  
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/panel/verify', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('login', ejs_data, config)
            response.render('panel.html', ejs_data) 
        }
        else{
            const username = request.session.username
            const player = players[username]
            if(player.moderator){
                await player.get_unverified_players()
                ejs_events.emit('verify', ejs_data, web, player)
                response.render('features.html', ejs_data) 
            }
            else{
                ejs_events.emit('403_page', ejs_data, request.url)
                response.render('403.html', ejs_data) 
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/redeem', async (request, response) =>{
    try{
        let ejs_data = {}
        const client_ip = dynamite.get_ip(request)
        const code_given = request.body.code
        const recaptcha_response = request.body.recaptcha_response
        const recaptcha_url = form_recaptcha_url(recaptcha_response, client_ip)
        const code = await dynamite.redemption_code.findOne({where: {Code: code_given}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }
        
        else if(!await recaptcha_test(recaptcha_url)){ 
            ejs_events.emit('redemption_captcha', ejs_data, web)
            response.render('features.html', ejs_data)
        }

        else if(!code){
            ejs_events.emit('404_code', ejs_data, web, code_given)
            response.render('features.html', ejs_data)
        }

        else if(await players[request.session.username].get_redeemed_codes() && players[request.session.username].redeemed_codes.includes(Number(code.ID))){
            ejs_events.emit('already_redeemed', ejs_data, web, code_given)
            response.render('features.html', ejs_data)
        }

        else if(code.Expires < new Date().getTime()){
            ejs_events.emit('expired_code', ejs_data, web, code_given)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            const awards = await get_redemption_awards(code.ID)
            player.coins += code.Coins
            await dynamite.penguin.update({Coins: player.coins}, {where: {ID: player.id}})
            await dynamite.penguin_redemption.create({PenguinID: player.id, CodeID: code.ID})
            await player.get_inventory()
            for (let item in awards){
                if(!player.inventory.includes(awards[item])){
                    await dynamite.inventory.create({PenguinID: player.id, ItemID: awards[item]})
                    ejs_events.emit('redemption_item', ejs_data, awards[item])
                }
            }
            const redemption_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Redemption Activity**')
            .addField('**Username**', `**${username}**`, true)
            .addField('**Redemption Code**', `**${code.Code}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A user has redeemed a code via web-panel redemption.**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.panel_hook.send(redemption_embed);
            dynamite.logger.player_log(`${player.username} has redeemed the following code ${code.Code}`)
            ejs_events.emit('successful_redemption', ejs_data, web, code, awards)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/namecolor', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_namecolor = request.body.namecolor
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s namecolor (${user.Namecolor}) to ${new_namecolor}`)
            await player.update_player_namecolor(user.ID, new_namecolor)
            ejs_events.emit('update_successful', ejs_data, web, player, user.Namecolor, new_namecolor)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/rank', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_rank = request.body.rank
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s rank (${user.Rank}) to ${new_rank}`)
            await player.update_player_rank(user.ID, new_rank)
            ejs_events.emit('update_successful', ejs_data, web, player, user.Rank, new_rank)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/coins', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_coins = request.body.coins
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s coins (${user.Coins}) to ${new_coins}`)
            await player.update_player_coins(user.ID, new_coins)
            ejs_events.emit('update_successful', ejs_data, web, player, user.Coins, new_coins)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/nickname', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_nickname = request.body.nickname
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s nickname (${user.Nickname}) to ${new_nickname}`)
            await player.update_player_nickname(user.ID, new_nickname)
            ejs_events.emit('update_successful', ejs_data, web, player, user.Nickname, new_nickname)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/approval', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s approval status`)
            await player.update_player_approval(given_id)
            const user_details = await player.get_user(given_id)
            const penguin = new Player(user_details)
            ejs_events.emit('edit_penguin', ejs_data, web, player, penguin)
            response.render('features.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/moderator', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s moderator status`)
            await player.update_player_moderator(given_id)
            const user_details = await player.get_user(given_id)
            const penguin = new Player(user_details)
            ejs_events.emit('edit_penguin', ejs_data, web, player, penguin)
            response.render('features.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.post('/panel/admin/(:id)/update/active', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s active status`)
            await player.update_player_active(given_id)
            const user_details = await player.get_user(given_id)
            const penguin = new Player(user_details)
            ejs_events.emit('edit_penguin', ejs_data, web, player, penguin)
            response.render('features.html', ejs_data) 
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.post('/panel/admin/(:id)/update/email', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_email = request.body.email
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(await email_taken(new_email)){
            ejs_events.emit('email_taken_admin', ejs_data, web, players[request.session.username], user, new_email)
            response.render('features.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s email (${user.Email}) to ${new_email}`)
            await player.update_player_email(user.ID, new_email)
            ejs_events.emit('update_successful', ejs_data, web, player, user.Email, new_email)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/password', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_password = request.body.password
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s password`)
            await player.update_player_password(user.ID, new_password)
            ejs_events.emit('update_successful', ejs_data, web, player)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/admin/(:id)/update/username', async (request, response) =>{
    try{
        let ejs_data = {}
        const new_username = request.body.username
        const given_id = request.params.id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})


        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].administrator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!user){
            response.redirect('/panel')
        }

        else if(await username_taken(new_username)){
            ejs_events.emit('username_taken_admin', ejs_data, web, players[request.session.username], user, new_username)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.admin_log(`${player.username} has updated ${user.Username}'s username to ${new_username}`)
            await player.update_player_username(user.ID, new_username)
            ejs_events.emit('update_successful', ejs_data, web, player, user.Username, new_username)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.post('/panel/email', async (request, response) =>{
    try{
        let ejs_data = {}
        const client_ip = dynamite.get_ip(request)
        const email_given = request.body.email
        const recaptcha_response = request.body.recaptcha_response
        const recaptcha_url = form_recaptcha_url(recaptcha_response, client_ip)

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!await recaptcha_test(recaptcha_url)){ 
            ejs_events.emit('email_captcha', ejs_data, web)
            response.render('features.html', ejs_data)
        }

        else if(await email_taken(email_given) || players[request.session.username].email == email_given){
            ejs_events.emit('change_email_taken', ejs_data, web, email_given)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.player_log(`${player.username} has updated their email from ${player.email} to ${email_given}`)
            await player.update_email(email_given)
            ejs_events.emit('email_successful', ejs_data, web, email_given)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/unban/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const id_given = request.params.id
        const banned_user_data = await dynamite.penguin.findOne({where: {ID: id_given}})
        const banned_user = await dynamite.ban.findOne({where: {PenguinID: id_given}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!banned_user_data){
            ejs_events.emit('banned_user_404', ejs_data, web, players[request.session.username], id_given)
            response.render('features.html', ejs_data)
        }

        else if(!banned_user){
            ejs_events.emit('user_not_banned', ejs_data, web, players[request.session.username], banned_user_data.Username)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.mod_log(`${player.username} has unbanned ${banned_user_data.Username}`)
            const unban_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Moderator Activity**')
            .addField('**Moderator Username**', `**${player.username}**`, true)
            .addField('**Unbanned User**', `**${banned_user_data.Username}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A moderator has unbanned a user.**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.unban_hook.send(unban_embed);
            await player.unban(id_given)
            await player.get_banned_data()
            ejs_events.emit('unban_successful', ejs_data, web, player, banned_user_data.Username)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/add_clothing/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
 
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!Number(given_id)){
            response.send(`Unknown parameter ${given_id}`)
        }

        else{
            const username = request.session.username
            const player = players[username]
            await player.get_inventory()
            if(player.inventory.includes(Number(given_id))){
                ejs_events.emit('items_added_exists', ejs_data, web, player, paper_items, given_id)
                response.render('features.html', ejs_data)
            }

            else{
                try{
                    await dynamite.inventory.create({PenguinID: player.id, ItemID: Number(given_id)})
                }
                catch(e){
                    dynamite.logger.crash(e)
                }
                dynamite.logger.mod_log(`${player.username} is trying to add the item ${given_id}`)
                const item_add = new dynamite.libraries.webhook.messageBuilder()
                .setTitle('**Moderator Activity**')
                .addField('**Moderator Username**', `**${player.username}**`, true)
                .addField('**Item ID**', `**${given_id}**`, true)
                .setColor(0x240b3b)
                .setDescription(`**A moderator has added an item to their inventory.**`)
                .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
                .setTimestamp();
                
                dynamite.item_hook.send(item_add);

                ejs_events.emit('added_clothing', ejs_data, web, player, paper_items, given_id)
                response.render('features.html', ejs_data)
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/add_clothing', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.body.item
 
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!Number(given_id)){
            response.send(`Unknown parameter ${given_id}`)
        }

        else{
            const username = request.session.username
            const player = players[username]
            await player.get_inventory()
            if(player.inventory.includes(Number(given_id))){
                ejs_events.emit('items_added_exists', ejs_data, web, player, paper_items, given_id)
                response.render('features.html', ejs_data)
            }

            else{
                try{
                    await dynamite.inventory.create({PenguinID: player.id, ItemID: Number(given_id)})
                }
                catch(e){
                    dynamite.logger.crash(e)
                }
                dynamite.logger.mod_log(`${player.username} is trying to add the item ${given_id}`)
                const item_add = new dynamite.libraries.webhook.messageBuilder()
                .setTitle('**Moderator Activity**')
                .addField('**Moderator Username**', `**${player.username}**`, true)
                .addField('**Item ID**', `**${given_id}**`, true)
                .setColor(0x240b3b)
                .setDescription(`**A moderator has added an item to their inventory.**`)
                .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
                .setTimestamp();
                
                dynamite.item_hook.send(item_add);

                ejs_events.emit('added_clothing', ejs_data, web, player, paper_items, given_id)
                response.render('features.html', ejs_data)
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/ban', async (request, response) =>{
    try{
        let ejs_data = {}
        const banned_username = request.body.banned_username
        const hours = request.body.hours
        const reason = request.body.reason
        const banned_user = await dynamite.penguin.findOne({where: {Username: banned_username}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!banned_user){
            ejs_events.emit('ban_target_404', ejs_data, web, players[request.session.username], banned_username)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.mod_log(`${player.username} has banned ${banned_user.Username}'s name`)
            const ban_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Moderator Activity**')
            .addField('**Moderator Username**', `**${player.username}**`, true)
            .addField('**Banned User**', `**${banned_user.Username}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A moderator has banned a user through the web-panel**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.ban_hook.send(ban_embed);
            await player.ban(banned_user, hours, reason)
            ejs_events.emit('ban_successful', ejs_data, web, player, banned_user.Username)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})


app.post('/panel/add_furniture/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.params.id
 
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!Number(given_id)){
            response.send(`Unknown parameter ${given_id}`)
        }

        else{
            const username = request.session.username
            const player = players[username]
            const furniture = await dynamite.furniture.findOne({where: {PenguinID: player.id, FurnitureID: given_id}})
            if(!furniture){
                try{
                    await dynamite.furniture.create({PenguinID: player.id, FurnitureID: Number(given_id), Quantity: 1})
                }
                catch(e){
                    dynamite.logger.crash(e)
                }
            }
            else{
                try{
                    const new_quantity = furniture.Quantity+1
                    await dynamite.furniture.update({Quantity: new_quantity}, {where: {PenguinID: player.id, FurnitureID: Number(given_id)}})
                }
                catch(e){
                    dynamite.logger.crash(e)
                }
            }
            dynamite.logger.mod_log(`${player.username} is trying to add the furniture item ID ${given_id}`)
            const item_add = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Moderator Activity**')
            .addField('**Moderator Username**', `**${player.username}**`, true)
            .addField('**Furniture ID**', `**${given_id}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A moderator has added a furniture item to their furniture inventory.**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.item_hook.send(item_add);

            ejs_events.emit('added_furniture', ejs_data, web, player, furniture_items, given_id)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/add_furniture', async (request, response) =>{
    try{
        let ejs_data = {}
        const given_id = request.body.item
 
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!Number(given_id)){
            response.send(`Unknown parameter ${given_id}`)
        }

        else{
            const username = request.session.username
            const player = players[username]
            const furniture = await dynamite.furniture.findOne({where: {PenguinID: player.id, FurnitureID: given_id}})
            if(!furniture){
                try{
                    await dynamite.furniture.create({PenguinID: player.id, FurnitureID: Number(given_id), Quantity: 1})
                }
                catch(e){
                    dynamite.logger.crash(e)
                }
            }
            else{
                try{
                    const new_quantity = furniture.Quantity+1
                    await dynamite.furniture.update({Quantity: new_quantity}, {where: {PenguinID: player.id, FurnitureID: Number(given_id)}})
                }
                catch(e){
                    dynamite.logger.crash(e)
                }
            }
            dynamite.logger.mod_log(`${player.username} is trying to add the furniture item ID ${given_id}`)
            const item_add = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Moderator Activity**')
            .addField('**Moderator Username**', `**${player.username}**`, true)
            .addField('**Furniture ID**', `**${given_id}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A moderator has added a furniture item to their furniture inventory.**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.item_hook.send(item_add);

            ejs_events.emit('added_furniture', ejs_data, web, player, furniture_items, given_id)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/logs/(:log_type)', async (request, response) =>{
    try{
        let ejs_data = {}
        const log_type = request.params.log_type

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            if(log_type === 'administrator' && config.owners.includes(player.username)){
                response.download(path.join(__dirname, '../logs/panel/admin.log'))
            }

            if(log_type === 'moderator' && player.administrator){
                response.download(path.join(__dirname, '../logs/panel/mod.log'))
            }

            if(log_type === 'player' && player.moderator){
                response.download(path.join(__dirname, '../logs/panel/player.log'))
            }

            if(log_type === 'website' && player.administrator){
                response.download(path.join(__dirname, '../logs/website.log'))
            }

            if(log_type === 'chat' && player.moderator){
                response.sendFile(path.join(__dirname, '../sauce/logs/chat.log'))
            }
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/verify/(:id)', async (request, response) =>{
    try{
        let ejs_data = {}
        const id_given = request.params.id
        const unverified_user = await dynamite.penguin.findOne({where: {ID: id_given}})

        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }

        else if(!players[request.session.username].moderator){
            ejs_events.emit('403_page', ejs_data, request.url)
            response.render('403.html', ejs_data)
        }

        else if(!unverified_user){
            ejs_events.emit('unverified_user_404', ejs_data, web, players[request.session.username], id_given)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            dynamite.logger.mod_log(`${player.username} has verified ${unverified_user.Username}'s name`)
            const verify_embed = new dynamite.libraries.webhook.messageBuilder()
            .setTitle('**Moderator Activity**')
            .addField('**Moderator Username**', `**${player.username}**`, true)
            .addField('**Verified Username**', `**${unverified_user.Username}**`, true)
            .setColor(0x240b3b)
            .setDescription(`**A moderator has verified a username.**`)
            .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
            .setTimestamp();
            
            dynamite.verify_hook.send(verify_embed);
            await player.verify(id_given)
            await player.get_unverified_players()
            ejs_events.emit('verify_successful', ejs_data, web, player, unverified_user.Username)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.post('/panel/password', async (request, response) =>{
    try{
        let ejs_data = {}
        const client_ip = dynamite.get_ip(request)
        const password_given = request.body.password
        const old_password = request.body.old_password
        const recaptcha_response = request.body.recaptcha_response
        const recaptcha_url = form_recaptcha_url(recaptcha_response, client_ip)
        
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }
        
        else if(!await recaptcha_test(recaptcha_url)){ 
            ejs_events.emit('password_captcha', ejs_data, web)
            response.render('features.html', ejs_data)
        }

        else if(!await check_password(old_password, players[request.session.username].password)){
            ejs_events.emit('incorrect_old_password', ejs_data, web)
            response.render('features.html', ejs_data)
        }

        else if(await check_password(password_given, players[request.session.username].password)){
            ejs_events.emit('same_password', ejs_data, web)
            response.render('features.html', ejs_data)
        }

        else{
            const username = request.session.username
            const player = players[username]
            const new_password = await generate_bcrypt_password(password_given)
            await player.update_password(new_password)
            dynamite.logger.player_log(`${player.username} has updated their password.`)
            ejs_events.emit('password_successful', ejs_data, web)
            response.render('features.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/login', async (request, response) =>{
    try{
        let ejs_data = {}
        if(!request.session.loggedin || !players[request.session.username]){
            ejs_events.emit('not_logged_in', ejs_data)
            response.render('login.html', ejs_data)
        }
    
        else{
            const username = request.session.username
            const player = players[username]
            await player.update_player()
            ejs_events.emit('logged_in', ejs_data, player)
            response.render('login.html', ejs_data)
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
        response.redirect(`https://${web.domain}`)
    }
})

app.get('/logout', (request, response) =>{
    let ejs_data = {}
    const username = request.session.username
    delete players[username]
    request.session.destroy()
    ejs_events.emit('logged_out', ejs_data, web)
    response.render('create.html', ejs_data)
})

app.get('/reset', (request, response) =>{
    let ejs_data = {}
    ejs_events.emit('reset', ejs_data, web)
    response.render('reset.html', ejs_data) 
})


app.get('/create', (request, response) =>{
    let ejs_data = {}
    ejs_events.emit('create', ejs_data, web)
    response.render('create.html', ejs_data) 
})

app.get('/staff', (request, response) =>{
    response.render('staff.html', {})
})

app.get('/play', (request, response) =>{
    response.render('play.html', {})
})

app.get('/manager', (request, response) =>{
    response.redirect('/panel')
})

app.get('/register', (request, response) =>{
    response.redirect('/create')
})

app.get('/registration', (request, response) =>{
    response.redirect('/create')
})

app.get('*', (request, response) => {
    let ejs_data = {}
    ejs_events.emit('404_page', ejs_data, request.url)
    response.render('404.html', ejs_data) 
})

app.listen(web.port, () => dynamite.logger.success(`running CPRI on port: ${web.port}!`))

class Player{
    constructor(user){
        this.id = user.ID
        this.username = user.Username
        this.nickname = user.Nickname
        this.password = user.Password
        this.approval = this.handle_boolean(user.Approval)
        this.active = this.handle_boolean(user.Active)
        this.is_moderator = this.handle_boolean(user.Moderator) 
        this.email = user.Email
        this.coins = user.Coins
        this.rank = user.Rank
        this.namecolor = user.namecolor
        this.administrator = false
        this.moderator = false
        this.redeemed_codes = []
        this.inventory = []
        this.webhook_initiate()
    }

    webhook_initiate(){
        const player_embed = new dynamite.libraries.webhook.messageBuilder()
        .setTitle('**Panel Activity**')
        .addField('**ID**', `**${this.id}**`, true)
        .addField('**Username**', `**${this.username}**`, true)
        .addField('**Nickname**', `**${this.nickname}**`, true)
        .addField('**Is Moderator?**', `**${this.is_moderator}**`, true)
        .addField('**Username Approved?**', `**${this.approval}**`, true)
        .addField('**User Activated?**', `**${this.active}**`, true)
        .setColor(0x240b3b)
        .setDescription(`**A user class has been created in the panel**`)
        .setFooter('powered by rsakeys.org 🚀', 'https://rsakeys.org/css/favicon.png')
        .setTimestamp();
        
        dynamite.panel_hook.send(player_embed);
        

    }

    async update_player(){
        const user = await dynamite.penguin.findOne({where: {ID: this.id}})
        this.username = user.Username
        this.coins = user.Coins
    }

    async get_redeemed_codes(){
        const redeemed_collection = await dynamite.penguin_redemption.findAll({where: {PenguinID: this.id}})
        for(let element in redeemed_collection){
            this.redeemed_codes.push(redeemed_collection[element].CodeID)
        }

        return true
    }

    async get_inventory(){
        const inventory_collection = await dynamite.inventory.findAll({where: {PenguinID: this.id}})
        for(let element in inventory_collection){
            this.inventory.push(inventory_collection[element].ItemID)
        }
    }

    async update_email(email){
        await dynamite.penguin.update({Email: email}, {where: {ID: this.id}})
        this.email = email
    }

    async update_password(password){
        await dynamite.penguin.update({Password: password}, {where: {ID: this.id}})
        this.password = password
    }

    handle_feature(feature){
        if (feature === 1){
            return true
        }
    
        else if (feature === 2 && this.moderator){
            return true
        }
    
        else if(feature === 3  && this.administrator){
            return true
        }
    
        else{
            return false
        }
    }

    handle_boolean(value){
        if(value === 1){
            return 'Yes'
        }
        else{
            return 'No'
        }
    }

}

class Staff extends Player{
    constructor(user, admin=null){
        super(user)
        this.moderator = true
        this.administrator = false
        this.ban_data = []
        this.unverified_players = []

        if(admin){
            this.administrator = true
        }
    }

    async get_banned_data(){
        this.ban_data = []
        let collection_of_bans = await dynamite.ban.findAll({})
        for(let element in collection_of_bans){
            let penguins = await dynamite.penguin.findAll({where: {ID: collection_of_bans[element].PenguinID}})
            let moderators = await dynamite.penguin.findAll({where: {ID: collection_of_bans[element].ModeratorID}})
            for(let penguin_element in penguins){
                for(let moderator_element in moderators){
                    collection_of_bans[element].Moderator = moderators[moderator_element].Username
                }
                collection_of_bans[element].Username = penguins[penguin_element].Username
                this.ban_data.push(collection_of_bans[element])
            }
        }
    }

    async get_unverified_players(){
        this.unverified_players = await dynamite.penguin.findAll({where: {Approval: 0}})
    }

    async unban(id){
        const given_id = id
        await dynamite.ban.destroy({where: {PenguinID: given_id}})
    } 

    async verify(id){
        const given_id = id
        await dynamite.penguin.update({Approval: 1}, {where: {ID: given_id}})
    }

    async ban(banned_user, hours, given_reason){
        const reason = given_reason
        let date = new Date().getTime()
        date += (hours * 60 * 60 * 1000)
        await dynamite.ban.create({PenguinID: banned_user.ID, ModeratorID: this.id, Reason: 0, Comment: reason, Expires: date})
    }

    async get_penguins(){
        return await dynamite.penguin.findAll({})
    }

    async get_user(id){
        return await dynamite.penguin.findOne({where: {ID: id}})
    }

    async update_player_username(id, username){
        const given_id = id
        const new_username = username
        await dynamite.penguin.update({Username: new_username}, {where: {ID: given_id}})
    }

    async update_player_nickname(id, nickname){
        const given_id = id
        const new_nickname = nickname
        await dynamite.penguin.update({Nickname: new_nickname}, {where: {ID: given_id}})
    }

    async update_player_password(id, password){
        const given_id = id
        const raw_password = password 
        let bcrypt_hash = await generate_bcrypt_password(raw_password)
        await dynamite.penguin.update({Password: bcrypt_hash}, {where: {ID: given_id}})
    }

    async update_player_email(id, email){
        const given_id = id
        const new_email = email
        await dynamite.penguin.update({Email: new_email}, {where: {ID: given_id}})
    }

    async update_player_coins(id, coins){
        const given_id = id
        const new_coins = coins
        await dynamite.penguin.update({Coins: new_coins}, {where: {ID: given_id}})
    }

    async update_player_rank(id, rank){
        const given_id = id
        const new_rank = rank
        await dynamite.penguin.update({Rank: new_rank}, {where: {ID: given_id}})
    }

    async update_player_namecolor(id, namecolor){
        const given_id = id
        const new_namecolor = namecolor
        await dynamite.penguin.update({namecolor: new_namecolor}, {where: {ID: given_id}})
    }


    async update_player_approval(id){
        const given_id = id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})
        await dynamite.penguin.update({Approval: !user.Approval}, {where: {ID: given_id}})
    }

    async update_player_active(id){
        const given_id = id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})
        await dynamite.penguin.update({Active: !user.Active}, {where: {ID: given_id}})
    }

    async update_player_moderator(id){
        const given_id = id
        const user = await dynamite.penguin.findOne({where: {ID: given_id}})
        await dynamite.penguin.update({Moderator: !user.Moderator}, {where: {ID: given_id}})
    }
}


function initialize_express(){
    app.engine('html', ejs.renderFile)
    app.set('view engine', 'html')
    app.set('views', path.join(__dirname, './frontend'))
    app.use('/css', express.static(path.join(__dirname, './frontend/css')))
    app.use('/js', express.static(path.join(__dirname, './frontend/js')))
    app.use('/img', express.static(path.join(__dirname, './frontend/img')))
    app.use('/sites', express.static(path.join(__dirname, './frontend/play/sites')))
    app.use('/media', express.static(path.join(__dirname, './frontend/media')))
    app.use(bodyparser.urlencoded({extended : true}))
    app.use(helmet())
    app.use(session({secret: web.session_secret, resave: true, saveUninitialized: true}))
}

function form_recaptcha_url(recaptcha_response, ip){
    let recaptcha_url = "https://www.google.com/recaptcha/api/siteverify?"
    recaptcha_url += "secret=" + web.secret_key + "&"
    recaptcha_url += "response=" + recaptcha_response + "&"
    recaptcha_url += "remoteip=" + ip
    return recaptcha_url
}


async function recaptcha_test(recaptcha_url){
    try{
        const score_return = await dynamite.libraries.request(recaptcha_url)
        const score = JSON.parse(score_return)
        const result = score.success
        if(result){
            return true
        }
        
        else{
            return false
        }
    }
    catch(e){
        dynamite.logger.crash(e)
    }
}

async function username_taken(username){
    try{
        const username_count = await dynamite.penguin.count({where: {Username: username}})
        if (username_count >= 1){
            return true 
        }

        else{
            return false
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file) 
    }
}

async function email_taken(email){
    try{
        const email_count = await dynamite.penguin.count({where: {Email: email}})
        if (email_count >= 1){
            return true 
        }
        else{
            return false
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
    }
}

async function ip_check(ip){
    try{
        const ip_count = await dynamite.penguin.count({where: {IP: ip}})
        if (ip_count >= 3){
            return true 
        }
        else{
            return false
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
    }
}


async function generate_bcrypt_password(raw_password){
    let password = dynamite.libraries.md5(raw_password).toUpperCase()
    password = password.substr(16, 16) + password.substr(0, 16)
    password += 'houdini'
    password += config.crypto.salt
    password = dynamite.libraries.md5(password)
    password = password.substr(16, 16) + password.substr(0, 16)
    const bcrypt_hash = await dynamite.libraries.bcrypt.hash(password, 12)
    return bcrypt_hash
}

async function check_password(given_password, database_password){
    try{
        const login_hash = get_login_hash(given_password, config.crypto.salt)
        const password = sanatize_password(database_password)
        const result = await dynamite.libraries.bcrypt.compare(login_hash, password)
        if(!result){
            return false
        }

        else{
            return true
        }
    }
    catch(e){
        dynamite.logger.crash(e)
        dynamite.error(file)
    }
}

function sanatize_password(given_password){
    let sanatized_password = given_password.replace(/^\$2y(.+)$/i, '$2a$1') 
    return sanatized_password
}

function get_login_hash(given_password, salt){
    let password = dynamite.libraries.md5(given_password).toUpperCase()
    password = password.substr(16, 16) + password.substr(0, 16)
    password += 'houdini'
    password += config.crypto.salt
    password = dynamite.libraries.md5(password)
    const hash = password.substr(16, 16) + password.substr(0, 16)
    return hash
}

function ip_spam(ip){
    if(login_ips[ip]){
        if(login_ips[ip] >= 5){
            return true
        }
        else{
            const attempts = login_ips[ip]
            login_ips[ip] = attempts+1
            return false
        }
    }
    else{
        login_ips[ip] = 1
    }
}

async function send_activation_mail(user){
    const id = Math.random().toString(26).slice(2)
    try{
        await dynamite.activation.create(({PenguinID: user.ID, ActivationKey: id}))
        await dynamite.transporter.sendMail({from: config.utils.nodemailer.username, to: user.Email, subject: `Activate your account for Club Penguin Reimagined`, text: `Thank you for registering to Club Penguin Reimagined. Please head over to https://${web.domain}/activate/${id} to activate your penguin.`, }) /* Change to a more professional written email if you like */
    }
    catch(e){
        dynamite.logger.crash(e)
    }
}

async function send_reset_email(given_email, user){
    const id = Math.random().toString(26).slice(2);
    let date = new Date().getTime();
    date += (12 * 60 * 60 * 1000);
    await dynamite.transporter_reset.sendMail({from: 'reset@cpreimagined.com', to: given_email, subject: `Reset your password for Club Penguin Reimagined`, text: `You requested to reset your password for your account under the email: ${given_email}. Please head over to https://${web.domain}/reset/${id} to choose a new password. If this was not you, please disregard this email.`, }); /* Change to a more professional written email if you like */
    await dynamite.reset.create({PenguinID: user.ID, ResetID: id, Expires: date})
}

async function get_redemption_awards(id){
    let award_list = []
    const redemption_awards = await dynamite.redemption_award.findAll({where: {CodeID: id}})
    for(let element in redemption_awards){
        award_list.push(redemption_awards[element].Award)
    }
    return award_list
}

async function build_avatar(user){
    const user_items = [user.Photo, user.Flag, 
        user.Color, user.Head, 
        user.Face, user.Neck, 
        user.Body, user.Hand,
        user.Feet]
    let canvas = dynamite.libraries.canvas.createCanvas(120, 120)
    let ctx = canvas.getContext('2d')
    check_cache_dir()
    await Promise.all(user_items.map(async item =>{
        await get_item(item) 
        await draw_image(ctx, item)
    }))
    const buff = canvas.toBuffer('image/png')
    return buff
}

async function draw_image(ctx, item){
    const item_path = path.join(__dirname, `../Cache/${item}.png`)
    if (fs.existsSync(item_path)){
        const img = await dynamite.libraries.canvas.loadImage(item_path)
        ctx.drawImage(img, 0, 0)
    }
}

async function get_item(item){
    const item_path = path.join(__dirname, `../Cache/${item}.png`)
    const options = {
        url: `https://icer.ink/mobcdn.clubpenguin.com/game/items/images/paper/image/120/${item}.png`,
        encoding: null
    }
    if (!fs.existsSync(item_path) && item !== 0){
        try{
            const img = await dynamite.libraries.request.get(options)
            const buffer = Buffer.from(img, 'utf8')
            fs.writeFileSync(item_path, buffer)
        }
        catch(e){
            if(e.statusCode === 404){
                return 
            }
            else{
                dynamite.logger.crash(e)
                dynamite.error(file)
            }
        }
    }
}

function check_cache_dir(){
    const cache_directory = path.join(__dirname, '../Cache/')
    if (!fs.existsSync(cache_directory)) {
        fs.mkdirSync(cache_directory)
    }
}

function initiate_player(user){
    if(config.admins.includes(user.ID)){
        return new Staff(user, true) // true = administrator
    }

    else if(user.Moderator === 1){
        return new Staff(user) 
    }
    
    else{ 
        return new Player(user)
    }
}
